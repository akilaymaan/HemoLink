"""
Eligibility scoring and XAI reasons using trained RandomForest model.
"""
import os
import joblib
import numpy as np
from typing import List

_artifacts_dir = os.path.join(os.path.dirname(__file__), "artifacts")
_model = None
_scaler = None
_feature_names = None


def _load_model():
    global _model, _scaler, _feature_names
    if _model is not None:
        return
    model_path = os.path.join(_artifacts_dir, "eligibility_model.joblib")
    scaler_path = os.path.join(_artifacts_dir, "eligibility_scaler.joblib")
    names_path = os.path.join(_artifacts_dir, "feature_names.joblib")
    if not os.path.isfile(model_path):
        raise FileNotFoundError(
            f"Model not found at {model_path}. Run: python train_model.py"
        )
    _model = joblib.load(model_path)
    _scaler = joblib.load(scaler_path)
    _feature_names = joblib.load(names_path)


def _build_features(
    days_since_last_donation: int,
    distance_km: float,
    is_available_now: bool,
    health_flags: list,
) -> np.ndarray:
    health_count = len(health_flags) if isinstance(health_flags, list) else int(health_flags or 0)
    x = np.array([[
        float(days_since_last_donation),
        float(distance_km),
        1.0 if is_available_now else 0.0,
        float(health_count),
    ]])
    return x


def compute_score_and_reasons(
    days_since_last_donation: int,
    distance_km: float,
    is_available_now: bool,
    health_flags: list,
) -> tuple:
    """
    Returns (score 0-100, list of XAI reason strings).
    Uses model for score and feature contributions for reasons.
    """
    _load_model()
    x = _build_features(
        days_since_last_donation,
        distance_km,
        is_available_now,
        health_flags,
    )
    x_scaled = _scaler.transform(x)
    score = float(np.clip(np.round(_model.predict(x_scaled)[0]), 0, 100))

    # Serious conditions (cancer, etc.) override: not eligible regardless of model
    flags_list = list(health_flags) if isinstance(health_flags, (list, tuple)) else []
    if "serious_condition" in flags_list:
        score = min(score, 15)

    # XAI: try Gemini for natural-language reasons when API key is set; else rule-based
    reasons = []
    try:
        from gemini_client import generate_xai_reasons_with_gemini
        health_count = len(health_flags) if isinstance(health_flags, list) else int(health_flags or 0)
        gemini_reasons = generate_xai_reasons_with_gemini(
            score=int(score),
            days_since_last_donation=days_since_last_donation,
            distance_km=distance_km,
            is_available_now=is_available_now,
            health_flag_count=health_count,
        )
        if gemini_reasons:
            reasons = gemini_reasons
    except Exception:
        pass
    if not reasons:
        if "serious_condition" in flags_list:
            reasons = ["Serious health condition (e.g. cancer) – not eligible for donation"]
        else:
            if days_since_last_donation >= 90:
                reasons.append("Eligible by donation gap (90+ days)")
            elif days_since_last_donation >= 60:
                reasons.append("Donation gap moderate (60–90 days)")
            else:
                reasons.append("Recently donated – check eligibility")
            if distance_km <= 5:
                reasons.append("Proximity match – within 5 km")
            elif distance_km <= 15:
                reasons.append("Within 15 km")
            if is_available_now:
                reasons.append("Marked available now")
            if score >= 80:
                reasons.append("High suitability score")

    return int(score), reasons
