# HemoLink ML Service

Python service that provides **real** AI/ML for:

- **Eligibility scoring**: RandomForestRegressor (scikit-learn) predicts donor–request match score (0–100).
- **XAI reasons**: Human-readable reasons — **Gemini** when `GEMINI_API_KEY` is set, else rule-based.
- **Health NLP**: **Gemini** when `GEMINI_API_KEY` is set (better understanding of free text); else NLTK tokenization + lemmatization + keyword matching.

## Setup

```bash
cd backend/ml-service
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python train_model.py
```

This creates `artifacts/eligibility_model.joblib`, `eligibility_scaler.joblib`, and `feature_names.joblib`.

### Train from real donor data (recommended)

With `blood_donor_dataset.csv` in the **project root** (`akil/`):

```bash
python train_from_csv.py
```

This uses real availability and months/number-of-donations from the CSV (10k rows) to train the same 4-feature model, prints validation MAE, and overwrites the artifacts. The API and feature names stay the same.

### Check that ML is working

```bash
python check_ml_working.py
```

Verifies: model loads and predicts a score in 0–100, NLP maps "I have cancer" to `serious_condition`, and serious_condition caps the score to ≤15.

### Optional: Gemini API (better NLP and XAI)

Get an API key from [Google AI Studio](https://aistudio.google.com/apikey), then:

```bash
cp .env.example .env
# Edit .env and set GEMINI_API_KEY=your-key
```

With `GEMINI_API_KEY` set, the service uses **Gemini** to:
- Extract health flags from free-text summaries (handles typos and paraphrases better).
- Generate natural-language XAI reasons for the eligibility score.

## Run

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- **POST /predict-eligibility**  
  Body: `{ "daysSinceLastDonation", "distanceKm", "isAvailableNow", "healthFlags": [] }`  
  Response: `{ "score": 0–100, "reasons": ["...", ...] }`

- **POST /normalize-health**  
  Body: `{ "text": "free text health summary" }`  
  Response: `{ "flags": ["recent_illness", "diabetes", ...] }`

- **GET /health**  
  Returns `{ "status": "ok" }`.

## Backend integration

Set in backend `.env`:

- `ML_SERVICE_URL=http://127.0.0.1:8000` (default) – Node calls this service; if it fails, falls back to local rules.
- `ML_SERVICE_URL=` (empty) – Disable ML; use rule-based eligibility and keyword NLP only.
- `ML_SERVICE_TIMEOUT_MS=5000` (optional).

The **ML service** reads `GEMINI_API_KEY` from its own environment (e.g. set in `backend/ml-service/.env` or when starting uvicorn). The Node backend does not need the Gemini key.

The Node backend uses this service for donor listing and request matching when the URL is set and the service is reachable.

## Tests (extreme outcomes)

With the venv activated and artifacts present (`python train_model.py`):

```bash
pip install pytest
python -m pytest test_ml_service.py -v
```

Covers: `/health`, `/normalize-health` (empty, cancer, diabetes, 422), `/predict-eligibility` (ideal → high score, worst case → low score, 0–100 range, 422).

## Is the ML working?

1. **Train**: `python train_model.py` or `python train_from_csv.py` (with `blood_donor_dataset.csv` in project root).
2. **Verify**: `python check_ml_working.py` – should print `[OK]` for predict, normalize-health, and serious_condition cap.
3. **Run service**: `uvicorn main:app --port 8000` and call `POST /predict-eligibility` with a JSON body; you should get `{ "score", "reasons" }`.
