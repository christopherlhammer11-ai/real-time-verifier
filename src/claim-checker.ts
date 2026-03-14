import { ClaimCheck, VerifyClaimsResult } from './types';

/**
 * Extract and verify claims from text.
 * Checks: URLs, emails, dates, numbers, JSON snippets.
 */
export function checkClaims(text: string): VerifyClaimsResult {
  const claims: ClaimCheck[] = [];

  // Extract and check URLs
  const urls = text.match(/https?:\/\/[^\s)>\]"']+/g) || [];
  for (const url of urls) {
    claims.push(checkUrlClaim(url));
  }

  // Extract and check email addresses
  const emails = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g) || [];
  for (const email of emails) {
    claims.push(checkEmailClaim(email));
  }

  // Extract and check dates
  const datePatterns = [
    /\b\d{4}-\d{2}-\d{2}\b/g,                          // ISO: 2024-01-15
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s+\d{4}\b/gi, // Jan 15, 2024
    /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,                    // MM/DD/YYYY
  ];

  for (const pattern of datePatterns) {
    const matches = text.match(pattern) || [];
    for (const match of matches) {
      claims.push(checkDateClaim(match));
    }
  }

  // Extract and check inline JSON
  const jsonBlocks = text.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g) || [];
  for (const block of jsonBlocks) {
    claims.push(checkJsonClaim(block));
  }

  // Extract and check large numbers for reasonableness
  const largeNumbers = text.match(/\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b/g) || [];
  for (const num of largeNumbers) {
    claims.push(checkNumberClaim(num));
  }

  const flaggedCount = claims.filter(c => !c.valid).length;
  const overallTrustScore = claims.length > 0
    ? Math.round(claims.reduce((s, c) => s + c.confidence, 0) / claims.length * 100) / 100
    : 1.0;

  return { claims, overallTrustScore, flaggedCount };
}

function checkUrlClaim(url: string): ClaimCheck {
  try {
    const parsed = new URL(url);
    const issues: string[] = [];

    if (parsed.protocol === 'http:') {
      issues.push('insecure HTTP');
    }

    // Check for suspicious patterns
    if (parsed.hostname.includes('localhost') || parsed.hostname === '127.0.0.1') {
      return {
        claim: url,
        type: 'url',
        valid: false,
        details: 'Points to localhost — not accessible externally',
        confidence: 0.2,
      };
    }

    // Check for obviously fake TLDs
    const tld = parsed.hostname.split('.').pop() || '';
    if (tld.length > 10 || tld.length < 2) {
      return {
        claim: url,
        type: 'url',
        valid: false,
        details: `Suspicious TLD: .${tld}`,
        confidence: 0.3,
      };
    }

    return {
      claim: url,
      type: 'url',
      valid: true,
      details: issues.length ? issues.join('; ') : 'Valid URL format',
      confidence: issues.length ? 0.7 : 0.9,
    };
  } catch {
    return {
      claim: url,
      type: 'url',
      valid: false,
      details: 'Malformed URL',
      confidence: 0,
    };
  }
}

function checkEmailClaim(email: string): ClaimCheck {
  const parts = email.split('@');
  if (parts.length !== 2) {
    return { claim: email, type: 'email', valid: false, details: 'Invalid format', confidence: 0 };
  }

  const domain = parts[1];
  const tld = domain.split('.').pop() || '';

  // Known disposable email domains
  const disposable = ['mailinator.com', 'tempmail.com', 'throwaway.email', 'guerrillamail.com'];
  if (disposable.includes(domain.toLowerCase())) {
    return {
      claim: email,
      type: 'email',
      valid: true,
      details: 'Disposable email provider',
      confidence: 0.4,
    };
  }

  if (tld.length < 2 || tld.length > 10) {
    return { claim: email, type: 'email', valid: false, details: `Invalid TLD: .${tld}`, confidence: 0.2 };
  }

  return { claim: email, type: 'email', valid: true, details: 'Valid email format', confidence: 0.8 };
}

function checkDateClaim(dateStr: string): ClaimCheck {
  const parsed = new Date(dateStr);

  if (isNaN(parsed.getTime())) {
    return { claim: dateStr, type: 'date', valid: false, details: 'Unparseable date', confidence: 0.2 };
  }

  const now = new Date();
  const diffMs = parsed.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  // Future dates beyond 5 years are suspicious
  if (diffDays > 365 * 5) {
    return {
      claim: dateStr,
      type: 'date',
      valid: true,
      details: `Far future date (${Math.round(diffDays / 365)} years ahead)`,
      confidence: 0.4,
    };
  }

  // Very old dates (before 1970) might be suspicious in most contexts
  if (parsed.getFullYear() < 1970) {
    return {
      claim: dateStr,
      type: 'date',
      valid: true,
      details: `Pre-1970 date — verify if intentional`,
      confidence: 0.6,
    };
  }

  return {
    claim: dateStr,
    type: 'date',
    valid: true,
    details: diffDays < 0
      ? `Past date (${Math.abs(Math.round(diffDays))} days ago)`
      : `Future date (${Math.round(diffDays)} days from now)`,
    confidence: 0.9,
  };
}

function checkJsonClaim(jsonStr: string): ClaimCheck {
  try {
    const parsed = JSON.parse(jsonStr);
    const issues: string[] = [];

    // Check for null values
    const nullKeys = findNulls(parsed);
    if (nullKeys.length) {
      issues.push(`Null values at: ${nullKeys.join(', ')}`);
    }

    // Check for empty strings
    const emptyKeys = findEmptyStrings(parsed);
    if (emptyKeys.length) {
      issues.push(`Empty strings at: ${emptyKeys.join(', ')}`);
    }

    return {
      claim: jsonStr.slice(0, 100) + (jsonStr.length > 100 ? '...' : ''),
      type: 'json',
      valid: true,
      details: issues.length ? issues.join('; ') : 'Valid JSON',
      confidence: issues.length ? 0.7 : 1.0,
    };
  } catch {
    return {
      claim: jsonStr.slice(0, 100) + (jsonStr.length > 100 ? '...' : ''),
      type: 'json',
      valid: false,
      details: 'Invalid JSON syntax',
      confidence: 0.1,
    };
  }
}

function checkNumberClaim(numStr: string): ClaimCheck {
  const value = parseFloat(numStr.replace(/,/g, ''));
  if (isNaN(value)) {
    return { claim: numStr, type: 'number', valid: false, details: 'Not a valid number', confidence: 0.2 };
  }

  return {
    claim: numStr,
    type: 'number',
    valid: true,
    details: `Parsed as ${value.toLocaleString()}`,
    confidence: 0.9,
  };
}

function findNulls(obj: unknown, prefix = ''): string[] {
  const results: string[] = [];
  if (obj === null) return [prefix || 'root'];
  if (typeof obj !== 'object' || obj === null) return results;

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value === null) results.push(path);
    else if (typeof value === 'object') results.push(...findNulls(value, path));
  }
  return results;
}

function findEmptyStrings(obj: unknown, prefix = ''): string[] {
  const results: string[] = [];
  if (typeof obj !== 'object' || obj === null) return results;

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value === '') results.push(path);
    else if (typeof value === 'object') results.push(...findEmptyStrings(value, path));
  }
  return results;
}
