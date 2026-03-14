import { validateJson } from '../src/json-validator';

describe('validateJson', () => {
  it('validates correct JSON', () => {
    const result = validateJson('{"name": "test", "value": 42}');
    expect(result.valid).toBe(true);
    expect(result.parseable).toBe(true);
    expect(result.fieldCount).toBe(2);
    expect(result.trustScore).toBe(1.0);
  });

  it('detects null values', () => {
    const result = validateJson('{"name": null, "data": {"nested": null}}');
    expect(result.hasNulls).toBe(true);
    expect(result.issues.some(i => i.includes('null'))).toBe(true);
    expect(result.trustScore).toBeLessThan(1.0);
  });

  it('detects empty strings', () => {
    const result = validateJson('{"name": "", "email": "test@test.com"}');
    expect(result.emptyStrings.length).toBeGreaterThan(0);
    expect(result.issues.some(i => i.includes('empty string'))).toBe(true);
  });

  it('reports invalid JSON with hints', () => {
    const result = validateJson('{"name": "test",}');
    expect(result.parseable).toBe(false);
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.includes('trailing comma'))).toBe(true);
  });

  it('detects truncated JSON', () => {
    const result = validateJson('{"name": "test", "items": [{"id": 1}');
    expect(result.parseable).toBe(false);
    expect(result.issues.some(i => i.includes('unclosed bracket'))).toBe(true);
  });

  it('detects single-quoted keys', () => {
    const result = validateJson("{'name': 'test'}");
    expect(result.parseable).toBe(false);
    expect(result.issues.some(i => i.includes('single quotes'))).toBe(true);
  });

  it('validates arrays', () => {
    const result = validateJson('[{"id": 1}, {"id": 2}, {"id": 3}]');
    expect(result.valid).toBe(true);
    expect(result.fieldCount).toBeGreaterThan(0);
  });

  it('flags inconsistent array structure', () => {
    const result = validateJson('[{"id": 1, "name": "a"}, {"id": 2}, {"id": 3, "name": "c", "extra": true}]');
    expect(result.issues.some(i => i.includes('inconsistent structure'))).toBe(true);
  });

  it('handles empty object', () => {
    const result = validateJson('{}');
    expect(result.parseable).toBe(true);
    expect(result.fieldCount).toBe(0);
    expect(result.issues.some(i => i.includes('Empty'))).toBe(true);
  });

  it('measures depth', () => {
    const result = validateJson('{"a": {"b": {"c": {"d": 1}}}}');
    expect(result.depth).toBe(3);
  });
});
