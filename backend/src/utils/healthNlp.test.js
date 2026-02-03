import { normalizeHealthToFlags } from './healthNlp.js';

describe('normalizeHealthToFlags', () => {
  it('returns empty array for empty or null', () => {
    expect(normalizeHealthToFlags('')).toEqual([]);
    expect(normalizeHealthToFlags(null)).toEqual([]);
  });

  it('detects recent_illness from synonyms', () => {
    expect(normalizeHealthToFlags('I was ill last week')).toContain('recent_illness');
    expect(normalizeHealthToFlags('had fever')).toContain('recent_illness');
    expect(normalizeHealthToFlags('no illness')).toContain('recent_illness');
  });

  it('detects diabetes', () => {
    expect(normalizeHealthToFlags('diabetic')).toContain('diabetes');
    expect(normalizeHealthToFlags('blood sugar high')).toContain('diabetes');
  });

  it('returns multiple flags when multiple match', () => {
    const r = normalizeHealthToFlags('diabetes and fever');
    expect(r).toContain('diabetes');
    expect(r).toContain('recent_illness');
    expect(r.length).toBeGreaterThanOrEqual(2);
  });

  it('detects serious_condition (cancer, aids, etc.)', () => {
    expect(normalizeHealthToFlags('I have cancer')).toContain('serious_condition');
    expect(normalizeHealthToFlags('on chemotherapy')).toContain('serious_condition');
    expect(normalizeHealthToFlags('I have AIDS')).toContain('serious_condition');
    expect(normalizeHealthToFlags('HIV positive')).toContain('serious_condition');
  });

  it('returns empty for irrelevant text', () => {
    const r = normalizeHealthToFlags('I like swimming and yoga');
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBe(0);
  });

  it('handles long text with multiple flags', () => {
    const r = normalizeHealthToFlags('I have diabetes and high blood pressure. Also on medication for fever last week.');
    expect(r).toContain('diabetes');
    expect(r).toContain('bp');
    expect(r).toContain('medication');
    expect(r).toContain('recent_illness');
  });

  it('handles undefined and non-string gracefully', () => {
    expect(normalizeHealthToFlags(undefined)).toEqual([]);
    expect(normalizeHealthToFlags(123)).toEqual([]);
  });
});
