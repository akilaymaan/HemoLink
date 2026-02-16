"""
FastAPI service: ML eligibility scoring and NLP health normalization.
Run: uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent / ".env")

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from eligibility_service import compute_score_and_reasons
from nlp_health import normalize_health_to_flags
from gemini_client import check_blood_donation_eligible, eligibility_score_from_full_context

app = FastAPI(title="HemoLink ML Service", version="1.0.0")


class PredictEligibilityBody(BaseModel):
    daysSinceLastDonation: int
    distanceKm: float
    isAvailableNow: bool
    healthFlags: List[str] = []
    healthSummary: Optional[str] = None  # when set + Gemini available, score comes from Gemini with full context


class NormalizeHealthBody(BaseModel):
    text: str


@app.post("/predict-eligibility")
def predict_eligibility(body: PredictEligibilityBody):
    """Eligibility score (0-100) and reasons: from Gemini with full context when healthSummary + API key set, else RandomForest."""
    try:
        health_summary = (body.healthSummary or "").strip()
        if health_summary:
            result = eligibility_score_from_full_context(
                health_summary=health_summary,
                days_since_last_donation=body.daysSinceLastDonation,
                distance_km=body.distanceKm,
                is_available_now=body.isAvailableNow,
            )
            if result is not None:
                score, reasons = result
                return {"score": score, "reasons": reasons}
        score, reasons = compute_score_and_reasons(
            days_since_last_donation=body.daysSinceLastDonation,
            distance_km=body.distanceKm,
            is_available_now=body.isAvailableNow,
            health_flags=body.healthFlags,
        )
        return {"score": score, "reasons": reasons}
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/check-eligibility-from-health")
def check_eligibility_from_health(body: NormalizeHealthBody):
    """Use Gemini to decide if health summary indicates ineligibility (no hardcoded diseases)."""
    try:
        result = check_blood_donation_eligible(body.text or "")
        if result is None:
            return {"eligible": True}
        eligible, reason = result
        return {"eligible": eligible, "reason": reason}
    except Exception as e:
        return {"eligible": True, "reason": None}


@app.post("/normalize-health")
def normalize_health(body: NormalizeHealthBody):
    """Extract eligibility-related health flags from free text using NLTK tokenization and lemmatization."""
    try:
        flags = normalize_health_to_flags(body.text or "")
        return {"flags": flags}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "ok"}
