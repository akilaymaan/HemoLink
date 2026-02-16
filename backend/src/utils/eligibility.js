/**
 * Mock ML eligibility scoring (local, no Python). Uses simple weighted rules
 * to mimic "adaptive" scoring. In production you'd replace with a real model.
 */
const SERIOUS_CONDITION_MAX_SCORE = 15; // cancer, hepatitis, etc. → not eligible

export function computeEligibilityScore({ daysSinceLastDonation, distanceKm, isAvailableNow, healthFlags }) {
  const flags = Array.isArray(healthFlags) ? healthFlags : [];
  if (flags.includes('serious_condition')) {
    return SERIOUS_CONDITION_MAX_SCORE; // Override: serious conditions disqualify
  }
  const minDaysBetweenDonations = 90;
  let score = 50;
  if (daysSinceLastDonation >= minDaysBetweenDonations) score += 25;
  else if (daysSinceLastDonation >= 60) score += 10;
  if (isAvailableNow) score += 15;
  if (distanceKm <= 5) score += 10;
  else if (distanceKm <= 15) score += 5;
  if (flags.length === 0) score += 5;
  else score -= flags.length * 10;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * XAI: reasons for eligibility (mock feature contribution).
 */
export function getXAIReasons({ daysSinceLastDonation, distanceKm, isAvailableNow, eligibilityScore, healthFlags }) {
  const reasons = [];
  const flags = Array.isArray(healthFlags) ? healthFlags : [];
  if (flags.includes('serious_condition')) {
    reasons.push('Serious health condition (e.g. cancer) – not eligible for donation');
    return reasons;
  }
  if (daysSinceLastDonation >= 90) reasons.push('Eligible by donation gap (90+ days)');
  else if (daysSinceLastDonation >= 60) reasons.push('Donation gap moderate (60–90 days)');
  else reasons.push('Recently donated – check eligibility');
  if (distanceKm <= 5) reasons.push('Proximity match – within 5 km');
  else if (distanceKm <= 15) reasons.push('Within 15 km');
  if (isAvailableNow) reasons.push('Marked available now');
  if (eligibilityScore >= 80) reasons.push('High suitability score');
  return reasons;
}
