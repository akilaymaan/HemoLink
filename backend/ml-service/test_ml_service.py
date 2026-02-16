"""
Tests for ML service endpoints: extreme and varied outcomes.
Run from backend/ml-service: python -m pytest test_ml_service.py -v
Requires: pip install pytest; artifacts from train_model.py.
"""
import os
import sys

import pytest
from fastapi.testclient import TestClient

# Ensure app can load (dotenv, paths)
sys.path.insert(0, os.path.dirname(__file__))

from main import app

client = TestClient(app)


def test_health():
    """GET /health returns 200 and status ok."""
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


class TestNormalizeHealth:
    """POST /normalize-health: NLP extraction with extreme/varied inputs."""

    def test_empty_text_returns_empty_flags(self):
        r = client.post("/normalize-health", json={"text": ""})
        assert r.status_code == 200
        assert r.json()["flags"] == []

    def test_none_text_returns_empty_flags(self):
        r = client.post("/normalize-health", json={"text": None})
        assert r.status_code == 200
        assert r.json()["flags"] == []

    def test_cancer_returns_serious_condition(self):
        r = client.post("/normalize-health", json={"text": "I have cancer"})
        assert r.status_code == 200
        flags = r.json()["flags"]
        assert "serious_condition" in flags

    def test_diabetes_and_fever_returns_multiple_flags(self):
        r = client.post("/normalize-health", json={"text": "I am diabetic and had fever last week"})
        assert r.status_code == 200
        flags = r.json()["flags"]
        assert "diabetes" in flags
        assert "recent_illness" in flags

    def test_irrelevant_text_returns_empty_or_minimal(self):
        r = client.post("/normalize-health", json={"text": "I like swimming and yoga"})
        assert r.status_code == 200
        flags = r.json()["flags"]
        assert "recent_illness" not in flags or "diabetes" not in flags

    def test_chemotherapy_returns_serious_condition(self):
        r = client.post("/normalize-health", json={"text": "on chemotherapy"})
        assert r.status_code == 200
        assert "serious_condition" in r.json()["flags"]

    def test_missing_body_returns_422(self):
        r = client.post("/normalize-health", json={})
        assert r.status_code == 422


class TestPredictEligibility:
    """POST /predict-eligibility: ML model with extreme outcomes."""

    @pytest.fixture(autouse=True)
    def check_artifacts(self):
        p = os.path.join(os.path.dirname(__file__), "artifacts", "eligibility_model.joblib")
        if not os.path.isfile(p):
            pytest.skip("Run python train_model.py first to create artifacts")

    def test_ideal_donor_high_score(self):
        """90+ days, near, available, no health flags -> high score."""
        r = client.post(
            "/predict-eligibility",
            json={
                "daysSinceLastDonation": 120,
                "distanceKm": 2.0,
                "isAvailableNow": True,
                "healthFlags": [],
            },
        )
        assert r.status_code == 200
        data = r.json()
        assert "score" in data
        assert "reasons" in data
        assert data["score"] >= 80
        assert isinstance(data["reasons"], list)
        assert len(data["reasons"]) >= 1

    def test_worst_case_low_score(self):
        """Recent donation, far, unavailable, many flags -> low score."""
        r = client.post(
            "/predict-eligibility",
            json={
                "daysSinceLastDonation": 1,
                "distanceKm": 999.0,
                "isAvailableNow": False,
                "healthFlags": ["recent_illness", "diabetes", "serious_condition"],
            },
        )
        assert r.status_code == 200
        data = r.json()
        assert data["score"] <= 40
        assert isinstance(data["reasons"], list)

    def test_boundary_90_days_higher_than_89(self):
        r90 = client.post(
            "/predict-eligibility",
            json={
                "daysSinceLastDonation": 90,
                "distanceKm": 10.0,
                "isAvailableNow": True,
                "healthFlags": [],
            },
        )
        r89 = client.post(
            "/predict-eligibility",
            json={
                "daysSinceLastDonation": 89,
                "distanceKm": 10.0,
                "isAvailableNow": True,
                "healthFlags": [],
            },
        )
        assert r90.status_code == 200 and r89.status_code == 200
        assert r90.json()["score"] >= r89.json()["score"]

    def test_score_in_range_0_100(self):
        r = client.post(
            "/predict-eligibility",
            json={
                "daysSinceLastDonation": 0,
                "distanceKm": 0.0,
                "isAvailableNow": False,
                "healthFlags": ["serious_condition", "diabetes", "anemia", "bp", "medication"],
            },
        )
        assert r.status_code == 200
        s = r.json()["score"]
        assert 0 <= s <= 100

    def test_invalid_body_returns_422(self):
        r = client.post("/predict-eligibility", json={"daysSinceLastDonation": 90})
        assert r.status_code == 422
