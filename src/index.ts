/**
 * Real-time Verifier — Verify API responses and data claims for LLM agents.
 *
 * @example
 * ```typescript
 * import { verify, verifyOffline } from 'real-time-verifier';
 *
 * // Full verification (includes URL liveness checks)
 * const report = await verify('Check https://api.example.com/users — returns JSON with 1,000 users');
 *
 * // Offline verification (no network, instant)
 * const report2 = verifyOffline('{"name": null, "email": ""}');
 *
 * console.log(report.overallTrustScore); // 0.0 - 1.0
 * console.log(report.issues);           // ['Unreachable URL: ...']
 * ```
 */

export { verify, verifyOffline } from './verifier';
export { checkUrls } from './url-checker';
export { checkClaims } from './claim-checker';
export { validateJson } from './json-validator';
export type {
  VerifyReport,
  VerifyUrlResult,
  VerifyClaimsResult,
  ClaimCheck,
  VerifyJsonResult,
  VerifyOptions,
} from './types';
