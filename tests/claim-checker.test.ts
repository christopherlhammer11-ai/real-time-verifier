import { checkClaims } from '../src/claim-checker';

describe('checkClaims', () => {
  it('validates well-formed URLs', () => {
    const result = checkClaims('Check https://api.example.com/v1/users for the data.');
    const urlClaim = result.claims.find(c => c.type === 'url');
    expect(urlClaim).toBeDefined();
    expect(urlClaim!.valid).toBe(true);
    expect(urlClaim!.confidence).toBeGreaterThan(0.5);
  });

  it('flags localhost URLs', () => {
    const result = checkClaims('The API is at http://localhost:3000/api');
    const urlClaim = result.claims.find(c => c.type === 'url');
    expect(urlClaim).toBeDefined();
    expect(urlClaim!.valid).toBe(false);
    expect(urlClaim!.details).toContain('localhost');
  });

  it('validates email addresses', () => {
    const result = checkClaims('Contact us at user@example.com');
    const emailClaim = result.claims.find(c => c.type === 'email');
    expect(emailClaim).toBeDefined();
    expect(emailClaim!.valid).toBe(true);
  });

  it('flags disposable emails', () => {
    const result = checkClaims('Send to test@mailinator.com');
    const emailClaim = result.claims.find(c => c.type === 'email');
    expect(emailClaim).toBeDefined();
    expect(emailClaim!.confidence).toBeLessThan(0.5);
  });

  it('validates ISO dates', () => {
    const result = checkClaims('Created on 2024-06-15');
    const dateClaim = result.claims.find(c => c.type === 'date');
    expect(dateClaim).toBeDefined();
    expect(dateClaim!.valid).toBe(true);
  });

  it('detects inline JSON', () => {
    const result = checkClaims('The config is {"key": "value", "count": 42}');
    const jsonClaim = result.claims.find(c => c.type === 'json');
    expect(jsonClaim).toBeDefined();
    expect(jsonClaim!.valid).toBe(true);
  });

  it('flags invalid inline JSON', () => {
    const result = checkClaims('Response was {key: value, broken}');
    const jsonClaim = result.claims.find(c => c.type === 'json');
    if (jsonClaim) {
      expect(jsonClaim.valid).toBe(false);
    }
  });

  it('calculates overall trust score', () => {
    const result = checkClaims('Check https://example.com on 2024-01-15');
    expect(result.overallTrustScore).toBeGreaterThan(0);
    expect(result.overallTrustScore).toBeLessThanOrEqual(1);
  });

  it('handles text with no claims', () => {
    const result = checkClaims('This is just plain text with no verifiable claims.');
    expect(result.claims).toHaveLength(0);
    expect(result.overallTrustScore).toBe(1.0);
    expect(result.flaggedCount).toBe(0);
  });
});
