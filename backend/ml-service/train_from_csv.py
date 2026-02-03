"""
Train eligibility model using real donor data from blood_donor_dataset.csv
plus the same 4-feature interface (distance_km and health_flag_count are synthetic for CSV).
Saves same artifacts as train_model.py so the API stays unchanged.
"""
import os
import csv
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import joblib

# Same as train_model.py – API expects these 4 features
FEATURE_NAMES = [
    "days_since_last_donation",
    "distance_km",
    "is_available_now",
    "health_flag_count",
]


def rule_based_score(days_since: int, distance_km: float, is_available: bool, health_flag_count: int) -> float:
    """Target label (0-100) for training."""
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


def load_csv_data(csv_path: str, seed: int = 42) -> tuple:
    """
    Load blood_donor_dataset.csv and build feature matrix X and target y.
    - days_since_last_donation: approximated from months_since_first_donation and number_of_donation
    - is_available_now: from availability (Yes/No)
    - distance_km, health_flag_count: synthetic (sampled) so we keep 4-feature API
    """
    np.random.seed(seed)
    rows = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                months = int(row.get("months_since_first_donation", 0))
                num_don = int(row.get("number_of_donation", 1))
                # Approximate days since last donation (average gap between donations)
                days_since = int((months * 30) / max(1, num_don))
                days_since = min(max(0, days_since), 400)
                is_available = 1 if (row.get("availability", "").strip().lower() == "yes") else 0
                rows.append((days_since, is_available))
            except (ValueError, KeyError):
                continue

    n = len(rows)
    if n == 0:
        raise ValueError(f"No valid rows in {csv_path}")

    # Build full 4-feature matrix: real days_since, real is_available, synthetic distance & health_flag_count
    X = np.zeros((n, 4))
    for i, (days_since, is_av) in enumerate(rows):
        X[i, 0] = days_since
        X[i, 1] = np.random.uniform(0, 100)   # distance_km – not in CSV
        X[i, 2] = is_av
        X[i, 3] = np.random.randint(0, 6)     # health_flag_count – not in CSV

    y = np.array([
        rule_based_score(int(X[i, 0]), float(X[i, 1]), bool(X[i, 2]), int(X[i, 3]))
        for i in range(n)
    ])
    return X, y


def main():
    # CSV: project root (akil/) or same dir as this script
    base = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(base, "..", ".."))
    for candidate in [
        os.path.join(project_root, "blood_donor_dataset.csv"),
        os.path.join(base, "blood_donor_dataset.csv"),
    ]:
        if os.path.isfile(candidate):
            csv_path = candidate
            break
    else:
        raise FileNotFoundError(
            "blood_donor_dataset.csv not found. Place it in project root (akil/) or in backend/ml-service/."
        )

    print("Loading", csv_path, "...")
    X, y = load_csv_data(csv_path)
    print(f"Loaded {len(X)} samples. Target range: [{y.min():.0f}, {y.max():.0f}]")

    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.15, random_state=42)
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_val_s = scaler.transform(X_val)

    model = RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42)
    model.fit(X_train_s, y_train)

    pred = model.predict(X_val_s)
    pred = np.clip(pred, 0, 100)
    mae = np.abs(pred - y_val).mean()
    print(f"Validation MAE (score 0-100): {mae:.2f}")

    out_dir = os.path.join(base, "artifacts")
    os.makedirs(out_dir, exist_ok=True)
    joblib.dump(model, os.path.join(out_dir, "eligibility_model.joblib"))
    joblib.dump(scaler, os.path.join(out_dir, "eligibility_scaler.joblib"))
    joblib.dump(FEATURE_NAMES, os.path.join(out_dir, "feature_names.joblib"))
    print("Model and scaler saved to", out_dir)


if __name__ == "__main__":
    main()
