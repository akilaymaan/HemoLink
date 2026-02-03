import { haversineKm } from './geo.js';

describe('haversineKm', () => {
  it('returns 0 for same point', () => {
    expect(haversineKm(12.9, 74.8, 12.9, 74.8)).toBe(0);
  });

  it('returns positive distance for two different points', () => {
    const km = haversineKm(12.9, 74.8, 13.0, 74.9);
    expect(km).toBeGreaterThan(0);
    expect(km).toBeLessThan(50);
  });

  it('is symmetric', () => {
    expect(haversineKm(12.9, 74.8, 13.0, 74.9)).toBe(haversineKm(13.0, 74.9, 12.9, 74.8));
  });

  it('returns ~0 for same point (edge)', () => {
    expect(haversineKm(0, 0, 0, 0)).toBe(0);
  });

  it('returns positive and reasonable for India span (Mumbai–Delhi approx)', () => {
    const km = haversineKm(19.076, 72.877, 28.704, 77.102);
    expect(km).toBeGreaterThan(1000);
    expect(km).toBeLessThan(1500);
  });
});
