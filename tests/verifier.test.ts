import { verifyOffline } from '../src/verifier';

describe('verifyOffline', () => {
  it('verifies clean text with no issues', () => {
    const report = verifyOffline('The server is running on port 3000.');
    expect(report.issues).toHaveLength(0);
    expect(report.overallTrustScore).toBe(1.0);
    expect(report.durationMs).toBeLessThan(100);
  });

  it('flags invalid JSON in content', () => {
    const report = verifyOffline('{"name": null, "data": ""}');
    expect(report.json).not.toBeNull();
    expect(report.json!.hasNulls).toBe(true);
    expect(report.overallTrustScore).toBeLessThan(1.0);
  });

  it('extracts and checks URL claims', () => {
    const report = verifyOffline(
      'The API is at http://localhost:3000/api and docs at https://docs.example.com',
    );
    const urlClaims = report.claims.filter(c => c.type === 'url');
    expect(urlClaims.length).toBe(2);

    const localhost = urlClaims.find(c => c.claim.includes('localhost'));
    expect(localhost!.valid).toBe(false);
  });

  it('verifies date claims', () => {
    const report = verifyOffline('Last updated on 2024-01-15, next release 2025-06-30');
    const dates = report.claims.filter(c => c.type === 'date');
    expect(dates.length).toBe(2);
    expect(dates.every(d => d.valid)).toBe(true);
  });

  it('produces a report with timestamp', () => {
    const report = verifyOffline('test content');
    expect(report.timestamp).toBeTruthy();
    expect(new Date(report.timestamp).getTime()).not.toBeNaN();
  });

  it('handles mixed content with multiple claim types', () => {
    const report = verifyOffline(
      'Contact user@example.com. API: https://api.example.com. Config: {"debug": true}. Updated 2024-03-15.',
    );
    const types = new Set(report.claims.map(c => c.type));
    expect(types.has('email')).toBe(true);
    expect(types.has('url')).toBe(true);
    expect(types.has('date')).toBe(true);
  });

  it('does not include URL liveness results', () => {
    const report = verifyOffline('Check https://example.com');
    expect(report.urls).toHaveLength(0);
  });
});
