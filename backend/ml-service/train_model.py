"""
Train eligibility scorer (RandomForestRegressor) on synthetic data that mimics
donor-match rules. Saves model and feature names for the FastAPI service.
"""
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
import joblib
import os

FEATURE_NAMES = [
    "days_since_last_donation",
    "distance_km",
    "is_available_now",
    "health_flag_count",
]


def rule_based_score(days_since: int, distance_km: float, is_available: bool, health_flag_count: int) -> float:
    """Reference rule-based score (0-100) used to generate training labels."""
    min_days = 90
    score = 50.0
    if days_since >= min_days:
        score += 25
    elif days_since >= 60:
        score += 10
    if is_available:
        score += 15
    if distance_km <= 5:
        score += 10
    elif distance_km <= 15:
        score += 5
    if health_flag_count == 0:
        score += 5
    else:
        score -= health_flag_count * 10
    return float(np.clip(np.round(score), 0, 100))


def generate_synthetic_data(n_samples: int = 5000, seed: int = 42) -> tuple:
    np.random.seed(seed)
    X = np.zeros((n_samples, len(FEATURE_NAMES)))
    X[:, 0] = np.random.randint(0, 400, size=n_samples)   # days since donation
    X[:, 1] = np.random.uniform(0, 100, size=n_samples)    # distance_km
    X[:, 2] = np.random.binomial(1, 0.5, size=n_samples)  # is_available_now
    X[:, 3] = np.random.randint(0, 6, size=n_samples)      # health_flag_count 0..5
    y = np.array([
        rule_based_score(
            int(X[i, 0]), float(X[i, 1]), bool(X[i, 2]), int(X[i, 3])
        )
        for i in range(n_samples)
    ])
    return X, y


def main():
    X, y = generate_synthetic_data()
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    model = RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42)
    model.fit(X_scaled, y)
    out_dir = os.path.join(os.path.dirname(__file__), "artifacts")
    os.makedirs(out_dir, exist_ok=True)
    joblib.dump(model, os.path.join(out_dir, "eligibility_model.joblib"))
    joblib.dump(scaler, os.path.join(out_dir, "eligibility_scaler.joblib"))
    joblib.dump(FEATURE_NAMES, os.path.join(out_dir, "feature_names.joblib"))
    print("Model and scaler saved to", out_dir)


if __name__ == "__main__":
    main()
