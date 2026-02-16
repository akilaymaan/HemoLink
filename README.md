# HemoLink – Blood Donor Discovery

Centralized web app to connect blood donors with people in urgent need. **Location-based search**, **SOS requests**, **ML-powered eligibility scoring**, **NLP health analysis**, **Explainable AI (XAI)** reasons, voice-based form filling, and optional **Gemini** integration. Built with a **test-driven** approach and **neobrutalism** UI.

---

## Quick start (first time)

**One-click (recommended):** Ensure `backend/.env` exists with your **cloud MongoDB URL** (`MONGODB_URI`) and `JWT_SECRET`. If you don’t have `.env` yet, run `cp backend/.env.example backend/.env`, edit it, then:

```bash
./scripts/run-all.sh
```

This script will: create `.env` from example if missing (and exit once so you can edit it), run `npm install` in backend and frontend, set up the ML venv and `pip install`, train the ML model if needed, then start **backend**, **frontend**, and **ML service**. Open **http://localhost:5173** in your browser. Ctrl+C stops all.

**Manual steps** (if you prefer):

| Step | What to do |
|------|------------|
| **1. Backend .env** | `cd backend && cp .env.example .env` — edit: `MONGODB_URI` (cloud URL), `JWT_SECRET`, optional `ML_SERVICE_URL=http://127.0.0.1:8000`. |
| **2. npm install** | `cd backend && npm install` then `cd frontend && npm install` |
| **3. ML (optional)** | `cd backend/ml-service && python3 -m venv .venv && source .venv/bin/activate` then `pip install -r requirements.txt`, `python train_model.py` once. |
| **4. Run** | See **Run all** below, or use `./scripts/run-all.sh`. |

---

## Run all (full stack)

After **Quick start** (`.env` set, `npm install` and optionally `pip install` + `train_model.py` done), use **3 terminals** (or 2 if you skip the ML service):

| Terminal | Command | URL |
|----------|---------|-----|
| **1** | `cd backend && npm run dev` | http://localhost:5000 |
| **2** | `cd frontend && npm run dev` | **http://localhost:5173** (open in browser) |
| **3** (optional) | `cd backend/ml-service && source .venv/bin/activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000` | http://localhost:8000 |

**One-click:** From project root, run `./scripts/run-all.sh` — it does setup (npm install, pip install, ML train if needed) and starts backend, frontend, and ML. Ctrl+C stops all. Requires Git Bash or WSL on Windows.

**To stop:** Ctrl+C in each terminal. MongoDB is cloud; no local process to stop.

---

## Quick start (step by step)

### 1. Backend (Node) — env and install

MongoDB uses a **cloud connection URL** (e.g. MongoDB Atlas). Put it in `backend/.env`.

```bash
cd backend
cp .env.example .env
# Edit .env: MONGODB_URI=<your-cloud-connection-url>, JWT_SECRET, ML_SERVICE_URL (optional)
npm install
npm test               # run all tests
npm run dev            # http://localhost:5000
```

### 2. Frontend (React + Vite)

```bash
cd frontend
npm install
npm test
npm run dev            # http://localhost:5173 (proxies /api to backend)
```

### 3. (Optional) ML service (Python)

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

Copy `backend/ml-service/.env.example` to `.env` and set **GEMINI_API_KEY** for better NLP and XAI ([Google AI Studio](https://aistudio.google.com/apikey)).

### 4. Use the app

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

## Environment

- **Backend** (`.env`): `PORT`, `MONGODB_URI` (cloud connection URL), `JWT_SECRET`, optional `ML_SERVICE_URL`, `ML_SERVICE_TIMEOUT_MS`.
- **ML service** (`backend/ml-service/.env`): optional `GEMINI_API_KEY`.
- **Frontend:** Vite proxies `/api` to backend; no env required for basic run.

---

## Design (Neobrutalism)

Bold black borders, flat bright colors (yellow, cyan, pink, green, red, purple), chunky shadows, mobile-first. AI/ML/NLP are emphasized in the UI (labels, badges, “Score updated” after save).

---

## License and disclaimer

This is a project/demo. Not for production medical use without proper compliance and validation.
