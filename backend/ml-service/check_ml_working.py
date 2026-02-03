#!/usr/bin/env python3
"""
Verify the ML pipeline is working: load model, run predict + normalize-health.
Run from backend/ml-service: python check_ml_working.py
"""
import sys
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))


def main():
    errors = []

    # 1. Model loads and predicts
    try:
        from eligibility_service import compute_score_and_reasons
        score, reasons = compute_score_and_reasons(
            days_since_last_donation=120,
            distance_km=5.0,
            is_available_now=True,
            health_flags=[],
        )
        assert isinstance(score, int) and 0 <= score <= 100, f"Bad score: {score}"
        assert isinstance(reasons, list) and len(reasons) >= 1, f"Bad reasons: {reasons}"
        print(f"  [OK] predict: score={score}, reasons={reasons[:2]}...")
    except FileNotFoundError as e:
        print("  [FAIL] Model not found. Run: python train_model.py  OR  python train_from_csv.py")
        errors.append(str(e))
        return 1
    except Exception as e:
        print("  [FAIL] predict:", e)
        errors.append(str(e))
        return 1

    # 2. NLP normalizes health text
    try:
        from nlp_health import normalize_health_to_flags
        flags = normalize_health_to_flags("I have cancer")
        assert "serious_condition" in flags, f"Expected serious_condition in {flags}"
        flags2 = normalize_health_to_flags("No illness")
        print(f"  [OK] normalize-health: 'I have cancer' -> {flags}, 'No illness' -> {flags2}")
    except Exception as e:
        print("  [FAIL] normalize-health:", e)
        errors.append(str(e))
        return 1

    # 3. Low score for serious condition
    try:
        from eligibility_service import compute_score_and_reasons
        score2, _ = compute_score_and_reasons(
            days_since_last_donation=120,
            distance_km=2.0,
            is_available_now=True,
            health_flags=["serious_condition"],
        )
        assert score2 <= 15, f"Expected score <= 15 for serious_condition, got {score2}"
        print(f"  [OK] serious_condition caps score to {score2}")
    except Exception as e:
        print("  [FAIL] serious_condition check:", e)
        errors.append(str(e))
        return 1

    print("\nML pipeline is working.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
