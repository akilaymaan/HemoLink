import { computeEligibilityScore, getXAIReasons } from './eligibility.js';

describe('computeEligibilityScore', () => {
  it('returns a number between 0 and 100', () => {
    const score = computeEligibilityScore({
      daysSinceLastDonation: 100,
      distanceKm: 5,
      isAvailableNow: true,
      healthFlags: [],
    });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('gives higher score when available and far since donation', () => {
    const high = computeEligibilityScore({
      daysSinceLastDonation: 120,
      distanceKm: 2,
      isAvailableNow: true,
      healthFlags: [],
    });
    const low = computeEligibilityScore({
      daysSinceLastDonation: 10,
      distanceKm: 50,
      isAvailableNow: false,
      healthFlags: ['recent_illness'],
    });
    expect(high).toBeGreaterThan(low);
  });

  it('returns 15 max when serious_condition (e.g. cancer) is in flags', () => {
    const score = computeEligibilityScore({
      daysSinceLastDonation: 120,
      distanceKm: 2,
      isAvailableNow: true,
      healthFlags: ['serious_condition'],
    });
    expect(score).toBe(15);
  });

  it('returns low score for extreme negative without serious_condition', () => {
    const score = computeEligibilityScore({
      daysSinceLastDonation: 1,
      distanceKm: 100,
      isAvailableNow: false,
      healthFlags: ['recent_illness', 'diabetes', 'anemia', 'bp', 'medication'],
    });
    expect(score).toBe(0);
  });

  it('returns 100 for ideal (90+ days, near, available, no flags)', () => {
    const score = computeEligibilityScore({
      daysSinceLastDonation: 120,
      distanceKm: 2,
      isAvailableNow: true,
      healthFlags: [],
    });
    expect(score).toBe(100);
  });

  it('boundary: exactly 90 days gives donation-gap bonus', () => {
    const at90 = computeEligibilityScore({
      daysSinceLastDonation: 90,
      distanceKm: 10,
      isAvailableNow: true,
      healthFlags: [],
    });
    const at89 = computeEligibilityScore({
      daysSinceLastDonation: 89,
      distanceKm: 10,
      isAvailableNow: true,
      healthFlags: [],
    });
    expect(at90).toBeGreaterThan(at89);
  });
});

describe('getXAIReasons', () => {
  it('returns array of strings', () => {
    const reasons = getXAIReasons({
      daysSinceLastDonation: 100,
      distanceKm: 3,
      isAvailableNow: true,
      eligibilityScore: 85,
    });
    expect(Array.isArray(reasons)).toBe(true);
    reasons.forEach((r) => expect(typeof r).toBe('string'));
  });

  it('includes proximity when distance is small', () => {
    const reasons = getXAIReasons({
      daysSinceLastDonation: 90,
      distanceKm: 1,
      isAvailableNow: true,
      eligibilityScore: 90,
    });
    expect(reasons.some((r) => r.toLowerCase().includes('proximity') || r.toLowerCase().includes('near'))).toBe(true);
  });

  it('includes recently donated when days < 60', () => {
    const reasons = getXAIReasons({
      daysSinceLastDonation: 30,
      distanceKm: 5,
      isAvailableNow: true,
      eligibilityScore: 40,
    });
    expect(reasons.some((r) => r.toLowerCase().includes('recent') || r.toLowerCase().includes('check'))).toBe(true);
  });

  it('returns serious-condition message when healthFlags includes serious_condition', () => {
    const reasons = getXAIReasons({
      daysSinceLastDonation: 90,
      distanceKm: 1,
      isAvailableNow: true,
      eligibilityScore: 15,
      healthFlags: ['serious_condition'],
    });
    expect(reasons).toHaveLength(1);
    expect(reasons[0].toLowerCase()).toMatch(/serious|cancer|not eligible/);
  });
});
