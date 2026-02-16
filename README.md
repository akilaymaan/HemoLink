# HemoLink – Blood Donor Discovery

Centralized web app to connect blood donors with people in urgent need. **Location-based search**, **SOS requests**, **ML-powered eligibility scoring**, **NLP health analysis**, **Explainable AI (XAI)** reasons, voice-based form filling, and optional **Gemini** integration. Built with a **test-driven** approach and **neobrutalism** UI.

---

## Quick start

### 1. MongoDB

Run locally (e.g. Docker):

```bash
docker run -d -p 27017:27017 --name hemolink-mongo mongo:7
```

### 2. Backend (Node)

```bash
cd backend
cp .env.example .env   # edit if needed
npm install
npm test               # run all tests
npm run dev            # http://localhost:5000
```

### 3. Frontend (React + Vite)

```bash
cd frontend
npm install
npm test
npm run dev            # http://localhost:5173 (proxies /api to backend)
```

### 4. (Optional) ML service (Python)

For **real ML scoring** and **NLP** health-flag extraction:

```bash
cd backend/ml-service
python3 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
# Train from real data (project root must contain blood_donor_dataset.csv):
python train_from_csv.py
# Or synthetic only: python train_model.py
python check_ml_working.py   # verify model + NLP work
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Dataset:** Put `blood_donor_dataset.csv` in the project root (`akil/`) to train with real donor rows (availability, months_since_first_donation, number_of_donation). The script approximates days-since-last and keeps the same 4-feature API.

Optional: set **GEMINI_API_KEY** in `backend/ml-service/.env` for better NLP and natural-language XAI reasons ([Google AI Studio](https://aistudio.google.com/apikey)).

### 5. Use the app

Open **http://localhost:5173**. Register as **donor** or **seeker**, set location (map or voice), then use **Emergency SOS** to find donors by blood group and radius. Donors are ranked by **ML suitability score** with **XAI** reasons.

---

## Tech stack

| Layer | Tech |
|-------|------|
| **Backend** | Node.js, Express, MongoDB (Mongoose), JWT auth |
| **Frontend** | React 18, Vite, Tailwind CSS, React Router, Leaflet (OpenStreetMap) |
| **ML service** | Python, FastAPI, scikit-learn (RandomForest), NLTK, optional Gemini |
| **Tests** | Jest + Supertest (backend), Vitest + RTL (frontend), pytest (ML service) |
| **Design** | Neobrutalism (bold borders, bright colors, chunky shadows) |

---

## API endpoints

All under `http://localhost:5000` (or your backend URL).

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | No | Health check; returns `{ ok: true }`. |
| POST | `/api/auth/register` | No | Register (email, password, name, role). |
| POST | `/api/auth/login` | No | Login; returns JWT. |
| GET | `/api/auth/me` | Yes | Current user. |
| POST | `/api/donors` | Yes | Create/update donor profile (bloodGroup, city, lat, lng, healthSummary, etc.). |
| GET | `/api/donors/me` | Yes | My donor profile with **eligibilityScore** and **xaiReasons** (ML). |
| GET | `/api/donors` | No | List donors (query: bloodGroup, city, lat, lng, radiusKm, availableOnly); each has score and XAI reasons. |
| POST | `/api/requests` | Yes | Create blood request. |
| GET | `/api/requests/match` | No | Match donors (query: bloodGroup or requestId, lat, lng, radiusKm). |
| GET | `/api/requests` | Yes | My blood requests. |

---

## Tests and validation

### Backend (Node)

```bash
cd backend && npm test
```

- **Utils:** `eligibility` (score 0–100, boundaries, extreme cases), `healthNlp` (flags including `serious_condition`), `geo` (Haversine).
- **Integration:** Auth (register, login, duplicate email, wrong password), donors (create, list, **GET /donors/me** with score), requests (create, **GET /match** with bloodGroup/requestId, 400/404), **GET /health**.

All endpoints are tested with **extreme and varied outcomes** (e.g. ideal donor → high score, cancer/many flags → low score; empty/invalid bodies → 4xx). When the ML service is not running, the backend uses **rule-based fallback** so tests pass without Python.

### Frontend

```bash
cd frontend && npm test
```

Component tests for `EligibilityGauge` and `XAIReasons`.

### ML service (Python)

From `backend/ml-service` with venv activated:

```bash
pip install pytest
python -m pytest test_ml_service.py -v
```

- **GET /health** → 200, `{ "status": "ok" }`.
- **POST /normalize-health:** empty text → `[]`, "I have cancer" → `serious_condition`, diabetes+fever → multiple flags, invalid body → 422.
- **POST /predict-eligibility:** ideal donor (90+ days, near, available, no flags) → high score; worst case (recent donation, far, many flags) → low score; score in [0, 100]; invalid body → 422.

Requires `python train_model.py` to be run first (artifacts in `artifacts/`).

---

## Project layout

```
akil/
├── backend/
│   ├── src/
│   │   ├── index.js           # Express app, routes, /health
│   │   ├── db.js
│   │   ├── models/             # User, Donor, BloodRequest
│   │   ├── routes/             # auth, donors, requests
│   │   ├── middleware/         # auth (JWT)
│   │   ├── services/           # mlClient.js (calls ML service)
│   │   ├── utils/              # geo, eligibility (fallback), healthNlp (fallback)
│   │   └── __tests__/          # auth, donors, requests, api.integration
│   ├── ml-service/             # Python FastAPI ML + NLP
│   │   ├── main.py             # /predict-eligibility, /normalize-health, /health
│   │   ├── train_model.py      # Train RandomForest, save artifacts
│   │   ├── eligibility_service.py
│   │   ├── nlp_health.py       # NLTK + term lists
│   │   ├── gemini_client.py    # Optional Gemini for NLP & XAI
│   │   ├── test_ml_service.py  # pytest: extreme outcomes
│   │   └── artifacts/          # *.joblib (model, scaler, feature names)
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api.js
│   │   ├── context/            # AuthContext
│   │   ├── components/         # Layout, EligibilityGauge, XAIReasons, LocationPicker, VoiceInputButton
│   │   ├── pages/              # Home, Login, Register, DonorDashboard, RequestBlood
│   │   ├── hooks/              # useVoiceInput
│   │   ├── utils/              # geocode (Nominatim), ocrRequisition
│   │   └── test/
│   └── package.json
├── README.md                   # This file
└── MOCKED.md                  # What is real vs mocked/local
```

---

## Environment

- **Backend** (`.env`): `PORT`, `MONGODB_URI`, `JWT_SECRET`, optional `ML_SERVICE_URL`, `ML_SERVICE_TIMEOUT_MS`.
- **ML service** (`backend/ml-service/.env`): optional `GEMINI_API_KEY`.
- **Frontend:** Vite proxies `/api` to backend; no env required for basic run.

---

## Design (Neobrutalism)

Bold black borders, flat bright colors (yellow, cyan, pink, green, red, purple), chunky shadows, mobile-first. AI/ML/NLP are emphasized in the UI (labels, badges, “Score updated” after save).

---

## License and disclaimer

This is a project/demo. Not for production medical use without proper compliance and validation.
