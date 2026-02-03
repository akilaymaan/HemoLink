/**
 * Client for the ML service (Python FastAPI): eligibility scoring and NLP health normalization.
 * Uses ML_SERVICE_URL from env; falls back to local rule-based utils if unset or request fails.
 */

const ML_SERVICE_URL = process.env.ML_SERVICE_URL?.trim() || 'http://127.0.0.1:8000';
const ML_DISABLED = process.env.ML_SERVICE_URL !== undefined && process.env.ML_SERVICE_URL.trim() === '';
const TIMEOUT_MS = Number(process.env.ML_SERVICE_TIMEOUT_MS) || 5000;

import { computeEligibilityScore, getXAIReasons } from '../utils/eligibility.js';
import { normalizeHealthToFlags } from '../utils/healthNlp.js';

async function fetchWithTimeout(url, options = {}, ms = TIMEOUT_MS) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

/**
 * Get eligibility score and XAI reasons from ML service, or fallback to local rules.
 * When healthSummary is provided and ML service has Gemini, score comes from Gemini with full context.
 * @param {Object} params - { daysSinceLastDonation, distanceKm, isAvailableNow, healthFlags, healthSummary? }
 * @returns {Promise<{ score: number, reasons: string[] }>}
 */
export async function getEligibilityFromML({ daysSinceLastDonation, distanceKm, isAvailableNow, healthFlags, healthSummary }) {
  const flags = Array.isArray(healthFlags) ? healthFlags : [];
  const summary = healthSummary != null ? String(healthSummary).trim() : '';
  if (ML_DISABLED || !ML_SERVICE_URL) {
    const score = computeEligibilityScore({ daysSinceLastDonation, distanceKm, isAvailableNow, healthFlags: flags });
    const reasons = getXAIReasons({ daysSinceLastDonation, distanceKm, isAvailableNow, eligibilityScore: score, healthFlags: flags });
    return { score, reasons };
  }
  try {
    const res = await fetchWithTimeout(`${ML_SERVICE_URL}/predict-eligibility`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        daysSinceLastDonation,
        distanceKm,
        isAvailableNow: !!isAvailableNow,
        healthFlags: flags,
        ...(summary ? { healthSummary: summary } : {}),
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || res.statusText);
    }
    const data = await res.json();
    let score = data.score ?? 0;
    let reasons = data.reasons ?? [];
    // Only cap by serious_condition when score was not from Gemini full context (no healthSummary sent)
    if (!summary && flags.includes('serious_condition')) {
      score = Math.min(score, 15);
      reasons = ['Serious health condition (e.g. cancer) – not eligible for donation'];
    }
    return { score, reasons };
  } catch (err) {
    const score = computeEligibilityScore({ daysSinceLastDonation, distanceKm, isAvailableNow, healthFlags: flags });
    const reasons = getXAIReasons({ daysSinceLastDonation, distanceKm, isAvailableNow, eligibilityScore: score, healthFlags: flags });
    return { score, reasons };
  }
}

const INELIGIBLE_SCORE = 15;

/**
 * Ask ML service (Gemini) if health summary indicates ineligibility. No hardcoded disease list.
 * @param {string} healthSummary
 * @returns {Promise<{ override: boolean, score?: number, reason?: string }>}
 */
export async function getEligibilityOverrideFromML(healthSummary) {
  if (!healthSummary || !String(healthSummary).trim()) return { override: false };
  if (ML_DISABLED || !ML_SERVICE_URL) return { override: false };
  try {
    const res = await fetchWithTimeout(`${ML_SERVICE_URL}/check-eligibility-from-health`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: healthSummary }),
    });
    if (!res.ok) return { override: false };
    const data = await res.json();
    if (data.eligible === false && data.reason) {
      return { override: true, score: INELIGIBLE_SCORE, reason: data.reason };
    }
  } catch (_) {}
  return { override: false };
}

/**
 * Normalize health free text to flags via ML service, or fallback to local keyword rules.
 * @param {string} healthSummary
 * @returns {Promise<string[]>}
 */
export async function getHealthFlagsFromML(healthSummary) {
  if (ML_DISABLED || !ML_SERVICE_URL) {
    return normalizeHealthToFlags(healthSummary);
  }
  try {
    const res = await fetchWithTimeout(`${ML_SERVICE_URL}/normalize-health`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: healthSummary ?? '' }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || res.statusText);
    }
    const data = await res.json();
    return data.flags ?? [];
  } catch (err) {
    return normalizeHealthToFlags(healthSummary);
  }
}
