export interface VerifyUrlResult {
  url: string;
  reachable: boolean;
  statusCode: number | null;
  responseTimeMs: number;
  contentType: string | null;
  redirected: boolean;
  finalUrl: string | null;
  issues: string[];
  trustScore: number;
}

export interface VerifyClaimsResult {
  claims: ClaimCheck[];
  overallTrustScore: number;
  flaggedCount: number;
}

export interface ClaimCheck {
  claim: string;
  type: 'url' | 'email' | 'date' | 'number' | 'json' | 'domain';
  valid: boolean;
  details: string;
  confidence: number;
}

export interface VerifyJsonResult {
  valid: boolean;
  parseable: boolean;
  issues: string[];
  fieldCount: number;
  depth: number;
  hasNulls: boolean;
  emptyStrings: string[];
  trustScore: number;
}

export interface VerifyOptions {
  /** Timeout in ms for URL checks. Default: 5000 */
  timeout?: number;
  /** Check URL liveness. Default: true */
  checkUrls?: boolean;
  /** Validate JSON structure. Default: true */
  checkJson?: boolean;
  /** Verify date claims. Default: true */
  checkDates?: boolean;
}

export interface VerifyReport {
  urls: VerifyUrlResult[];
  claims: ClaimCheck[];
  json: VerifyJsonResult | null;
  overallTrustScore: number;
  issues: string[];
  timestamp: string;
  durationMs: number;
}
