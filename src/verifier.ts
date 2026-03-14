import { VerifyReport, VerifyOptions } from './types';
import { checkUrls } from './url-checker';
import { checkClaims } from './claim-checker';
import { validateJson } from './json-validator';

const DEFAULT_OPTIONS: Required<VerifyOptions> = {
  timeout: 5000,
  checkUrls: true,
  checkJson: true,
  checkDates: true,
};

/**
 * Run a full verification pass on content.
 * Checks URLs, claims, and JSON structure.
 */
export async function verify(
  content: string,
  options?: VerifyOptions,
): Promise<VerifyReport> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const start = Date.now();
  const issues: string[] = [];

  // Extract URLs for liveness checking
  const urls = content.match(/https?:\/\/[^\s)>\]"']+/g) || [];
  const urlResults = opts.checkUrls && urls.length > 0
    ? await checkUrls(urls, opts.timeout)
    : [];

  // Check claims in text
  const claimResults = checkClaims(content);

  // Try to validate as JSON
  let jsonResult = null;
  if (opts.checkJson) {
    const trimmed = content.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      jsonResult = validateJson(trimmed);
    }
  }

  // Aggregate issues
  for (const url of urlResults) {
    if (!url.reachable) {
      issues.push(`Unreachable URL: ${url.url}`);
    }
    issues.push(...url.issues.filter(i => !i.startsWith('Redirected')));
  }
  for (const claim of claimResults.claims) {
    if (!claim.valid) {
      issues.push(`Invalid ${claim.type}: ${claim.claim} — ${claim.details}`);
    }
  }
  if (jsonResult && !jsonResult.valid) {
    issues.push(...jsonResult.issues);
  }

  // Calculate overall trust score
  const scores: number[] = [];
  if (urlResults.length) {
    scores.push(urlResults.reduce((s, u) => s + u.trustScore, 0) / urlResults.length);
  }
  if (claimResults.claims.length) {
    scores.push(claimResults.overallTrustScore);
  }
  if (jsonResult) {
    scores.push(jsonResult.trustScore);
  }

  const overallTrustScore = scores.length > 0
    ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length * 100) / 100
    : 1.0;

  return {
    urls: urlResults,
    claims: claimResults.claims,
    json: jsonResult,
    overallTrustScore,
    issues,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - start,
  };
}

/**
 * Quick verify — just check claims without URL liveness (no network).
 */
export function verifyOffline(content: string): VerifyReport {
  const start = Date.now();
  const claimResults = checkClaims(content);
  const issues: string[] = [];

  let jsonResult = null;
  const trimmed = content.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    jsonResult = validateJson(trimmed);
    if (!jsonResult.valid) issues.push(...jsonResult.issues);
  }

  for (const claim of claimResults.claims) {
    if (!claim.valid) {
      issues.push(`Invalid ${claim.type}: ${claim.claim} — ${claim.details}`);
    }
  }

  const scores: number[] = [];
  if (claimResults.claims.length) scores.push(claimResults.overallTrustScore);
  if (jsonResult) scores.push(jsonResult.trustScore);

  return {
    urls: [],
    claims: claimResults.claims,
    json: jsonResult,
    overallTrustScore: scores.length > 0
      ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length * 100) / 100
      : 1.0,
    issues,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - start,
  };
}
