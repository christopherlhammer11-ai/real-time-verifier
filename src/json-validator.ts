import { VerifyJsonResult } from './types';

/**
 * Deep validate a JSON response for structural issues.
 */
export function validateJson(input: string): VerifyJsonResult {
  const issues: string[] = [];

  // Try to parse
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch (err) {
    // Attempt to identify common JSON issues
    const fixAttempts = tryFixJson(input);
    return {
      valid: false,
      parseable: false,
      issues: [`Parse error: ${(err as Error).message}`, ...fixAttempts],
      fieldCount: 0,
      depth: 0,
      hasNulls: false,
      emptyStrings: [],
      trustScore: 0.1,
    };
  }

  // Structural analysis
  const { fieldCount, depth } = analyzeStructure(parsed);
  const nullPaths = findPaths(parsed, v => v === null);
  const emptyStringPaths = findPaths(parsed, v => v === '');
  const undefinedPaths = findPaths(parsed, v => v === undefined);

  if (nullPaths.length > 0) {
    issues.push(`${nullPaths.length} null value(s): ${nullPaths.slice(0, 3).join(', ')}${nullPaths.length > 3 ? '...' : ''}`);
  }
  if (emptyStringPaths.length > 0) {
    issues.push(`${emptyStringPaths.length} empty string(s): ${emptyStringPaths.slice(0, 3).join(', ')}${emptyStringPaths.length > 3 ? '...' : ''}`);
  }
  if (undefinedPaths.length > 0) {
    issues.push(`${undefinedPaths.length} undefined value(s)`);
  }
  if (depth > 10) {
    issues.push(`Deep nesting (depth ${depth}) — may indicate serialization issues`);
  }
  if (fieldCount === 0 && typeof parsed === 'object') {
    issues.push('Empty object or array');
  }

  // Check for truncated arrays (common in hallucinated responses)
  checkTruncation(parsed, issues);

  let trustScore = 1.0;
  if (nullPaths.length > 0) trustScore -= Math.min(0.3, nullPaths.length * 0.05);
  if (emptyStringPaths.length > 0) trustScore -= Math.min(0.2, emptyStringPaths.length * 0.05);
  if (fieldCount === 0) trustScore -= 0.3;
  if (depth > 10) trustScore -= 0.1;
  trustScore = Math.max(0, Math.round(trustScore * 100) / 100);

  return {
    valid: issues.length === 0,
    parseable: true,
    issues,
    fieldCount,
    depth,
    hasNulls: nullPaths.length > 0,
    emptyStrings: emptyStringPaths,
    trustScore,
  };
}

function analyzeStructure(obj: unknown, currentDepth = 0): { fieldCount: number; depth: number } {
  if (typeof obj !== 'object' || obj === null) {
    return { fieldCount: 0, depth: currentDepth };
  }

  const entries = Array.isArray(obj) ? obj.map((v, i) => [String(i), v] as const) : Object.entries(obj);
  let fieldCount = entries.length;
  let maxDepth = currentDepth;

  for (const [, value] of entries) {
    if (typeof value === 'object' && value !== null) {
      const nested = analyzeStructure(value, currentDepth + 1);
      fieldCount += nested.fieldCount;
      maxDepth = Math.max(maxDepth, nested.depth);
    }
  }

  return { fieldCount, depth: maxDepth };
}

function findPaths(
  obj: unknown,
  predicate: (v: unknown) => boolean,
  prefix = '',
): string[] {
  const results: string[] = [];
  if (predicate(obj)) return [prefix || 'root'];
  if (typeof obj !== 'object' || obj === null) return results;

  const entries = Array.isArray(obj)
    ? obj.map((v, i) => [String(i), v] as const)
    : Object.entries(obj);

  for (const [key, value] of entries) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (predicate(value)) {
      results.push(path);
    } else if (typeof value === 'object' && value !== null) {
      results.push(...findPaths(value, predicate, path));
    }
  }

  return results;
}

function checkTruncation(obj: unknown, issues: string[]): void {
  if (!Array.isArray(obj)) return;

  // Check if array items have inconsistent structure (sign of truncation/hallucination)
  if (obj.length > 2) {
    const firstKeys = obj[0] && typeof obj[0] === 'object'
      ? new Set(Object.keys(obj[0] as Record<string, unknown>))
      : null;

    if (firstKeys) {
      let mismatches = 0;
      for (let i = 1; i < obj.length; i++) {
        if (typeof obj[i] !== 'object' || obj[i] === null) {
          mismatches++;
          continue;
        }
        const keys = Object.keys(obj[i] as Record<string, unknown>);
        if (keys.length !== firstKeys.size || !keys.every(k => firstKeys.has(k))) {
          mismatches++;
        }
      }
      if (mismatches > 0) {
        issues.push(`${mismatches}/${obj.length - 1} array items have inconsistent structure`);
      }
    }
  }
}

function tryFixJson(input: string): string[] {
  const hints: string[] = [];

  // Trailing comma
  if (/,\s*[}\]]/.test(input)) {
    hints.push('Hint: Contains trailing comma(s) — remove commas before } or ]');
  }

  // Single quotes instead of double
  if (/'[^']*'\s*:/.test(input)) {
    hints.push('Hint: Uses single quotes — JSON requires double quotes');
  }

  // Unquoted keys
  if (/{\s*\w+\s*:/.test(input) && !/"[^"]*"\s*:/.test(input)) {
    hints.push('Hint: Unquoted keys — JSON requires keys to be double-quoted strings');
  }

  // Truncated (no closing bracket)
  const opens = (input.match(/[{[]/g) || []).length;
  const closes = (input.match(/[}\]]/g) || []).length;
  if (opens > closes) {
    hints.push(`Hint: ${opens - closes} unclosed bracket(s) — likely truncated response`);
  }

  return hints;
}
