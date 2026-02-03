"""
Gemini API client for health NLP and XAI reasons. Uses GEMINI_API_KEY from env.
Falls back to None (caller uses rule-based logic) if key is missing or request fails.
"""
import os
import json
import re
from typing import List, Optional

_gemini_configured = False
_gemini_disabled = False


def _extract_json(text: str) -> Optional[dict]:
    """Extract first JSON object from text (handles markdown code blocks and trailing text)."""
    start = text.find("{")
    if start == -1:
        return None
    depth = 0
    for i, c in enumerate(text[start:], start=start):
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(text[start : i + 1])
                except json.JSONDecodeError:
                    return None
    return None


def _ensure_gemini():
    global _gemini_configured, _gemini_disabled
    if _gemini_configured:
        return _gemini_disabled is False
    api_key = (os.environ.get("GEMINI_API_KEY") or "").strip()
    if not api_key:
        _gemini_configured = True
        _gemini_disabled = True
        return False
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        _gemini_configured = True
        _gemini_disabled = False
        return True
    except Exception:
        _gemini_configured = True
        _gemini_disabled = True
        return False


def is_gemini_available() -> bool:
    return _ensure_gemini()


def eligibility_score_from_full_context(
    health_summary: str,
    days_since_last_donation: int,
    distance_km: float,
    is_available_now: bool,
) -> Optional[tuple[int, List[str]]]:
    """
    Use Gemini with entire donor context to produce eligibility score (0-100) and reasons.
    No separate model or rules – one LLM call with full context (health, donation gap, distance, availability).
    Returns (score, reasons) or None on failure.
    """
    if not _ensure_gemini():
        return None
    try:
        import google.generativeai as genai
        model = genai.GenerativeModel("gemini-1.5-flash")
        summary = (health_summary or "").strip() or "No health issues reported."
        prompt = f"""You are a blood donation eligibility advisor. Given the FULL context below, output a single eligibility score from 0 to 100 and 2 to 5 short reasons.

Context:
- Health summary: {summary}
- Days since last donation: {days_since_last_donation}
- Distance to request (km): {distance_km:.1f}
- Available to donate now: {is_available_now}

Use WHO and standard blood bank rules: HIV, AIDS, hepatitis, cancer, recent illness, chemotherapy, etc. make someone ineligible (score 0-20). Long gap since donation (e.g. 90+ days), being available, and short distance increase eligibility. Return ONLY a JSON object, no other text:
{{"score": <0-100>, "reasons": ["reason1", "reason2", ...]}}
"""
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.2,
                max_output_tokens=512,
            ),
        )
        text = (response.text or "").strip()
        data = _extract_json(text)
        if not data:
            return None
        score = data.get("score")
        if score is None:
            return None
        score = max(0, min(100, int(round(float(score)))))
        reasons = data.get("reasons") or []
        reasons = [str(r).strip() for r in reasons if r][:6]
        if not reasons:
            reasons = [f"Eligibility score: {score}/100 (from full context)."]
        return (score, reasons)
    except Exception:
        return None


def check_blood_donation_eligible(health_summary: str) -> Optional[tuple[bool, Optional[str]]]:
    """
    Use Gemini to decide if the person is eligible to donate blood based on health summary.
    No hardcoded disease list – uses medical knowledge (HIV, AIDS, hepatitis, cancer, etc.).
    Returns (True, None) if eligible, (False, reason_string) if not, or None on API failure.
    """
    if not health_summary or not health_summary.strip():
        return (True, None)
    if not _ensure_gemini():
        return None
    try:
        import google.generativeai as genai
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = """You are a medical advisor for blood donation eligibility. Based on WHO and standard blood bank guidelines, is this person ELIGIBLE to donate blood?

Consider as NOT eligible: HIV, AIDS, hepatitis B or C, cancer, recent chemotherapy, chronic conditions that bar donation, recent major surgery, etc. If the summary mentions any condition that typically disqualifies blood donors, set eligible to false and give a short reason.

Respond with ONLY a JSON object, no other text. Use exactly: {"eligible": false, "reason": "your reason"} or {"eligible": true}

Health summary:
"""
        response = model.generate_content(
            prompt + health_summary.strip(),
            generation_config=genai.types.GenerationConfig(
                temperature=0.1,
                max_output_tokens=256,
            ),
        )
        text = (response.text or "").strip()
        data = _extract_json(text)
        if not data:
            return None
        eligible = data.get("eligible", True)
        if eligible:
            return (True, None)
        reason = (data.get("reason") or "Health summary indicates conditions that typically disqualify blood donation.").strip()
        return (False, reason or None)
    except Exception:
        return None


def generate_health_flags_with_gemini(health_summary: str) -> Optional[List[str]]:
    """
    Use Gemini to extract eligibility-related health flags from free text.
    Returns list of flags (e.g. recent_illness, diabetes, anemia, bp, medication) or None on failure.
    """
    if not health_summary or not health_summary.strip():
        return []
    if not _ensure_gemini():
        return None
    try:
        import google.generativeai as genai
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = """You are a medical text analyzer for blood donor eligibility. From the donor's health summary below, extract ONLY the following flags if clearly mentioned (use exactly these names, nothing else):
- recent_illness (recent fever, cold, flu, infection, cough, unwell)
- diabetes (diabetes, blood sugar, glucose issues)
- anemia (anemia, low haemoglobin/hemoglobin, low iron, thalassemia)
- bp (blood pressure, hypertension, hypotension)
- medication (currently on medication, antibiotics, prescription drugs)
- serious_condition (cancer, chemotherapy, cancer treatment, HIV, hepatitis B/C, heart disease, stroke, major surgery, or any condition that typically disqualifies blood donation)

If a flag is not mentioned or unclear, do not include it. For "I have cancer" or similar, always include serious_condition. Respond with ONLY a JSON object of this form, no other text:
{"flags": ["flag1", "flag2"]}

Health summary:
"""
        response = model.generate_content(
            prompt + health_summary.strip(),
            generation_config=genai.types.GenerationConfig(
                temperature=0.1,
                max_output_tokens=256,
            ),
        )
        text = (response.text or "").strip()
        data = _extract_json(text)
        if data:
            flags = data.get("flags") or []
            allowed = {"recent_illness", "diabetes", "anemia", "bp", "medication", "serious_condition"}
            return [f for f in flags if f in allowed]
        return None
    except Exception:
        return None


def generate_xai_reasons_with_gemini(
    score: int,
    days_since_last_donation: int,
    distance_km: float,
    is_available_now: bool,
    health_flag_count: int,
) -> Optional[List[str]]:
    """
    Use Gemini to generate 3–5 short, clear XAI reasons for the eligibility score.
    Returns list of reason strings or None on failure.
    """
    if not _ensure_gemini():
        return None
    try:
        import google.generativeai as genai
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = f"""You are explaining why a blood donor has an eligibility score of {score}/100 to a requester. Based only on these facts, give 3 to 5 short, clear reasons (one line each). Be factual and neutral.

Facts:
- Days since last donation: {days_since_last_donation}
- Distance to request (km): {distance_km:.1f}
- Available now: {is_available_now}
- Number of health flags (conditions/medication): {health_flag_count}

Respond with ONLY a JSON object of this form, no other text:
{{"reasons": ["Reason one.", "Reason two.", "Reason three."]}}
"""
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.2,
                max_output_tokens=512,
            ),
        )
        text = (response.text or "").strip()
        data = _extract_json(text)
        if data:
            reasons = data.get("reasons") or []
            return [str(r).strip() for r in reasons if r][:6]
        return None
    except Exception:
        return None
