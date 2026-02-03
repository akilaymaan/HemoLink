# What Is Mocked or Local (HemoLink)

This is a **testing / non-production** setup. The following are **mocked** or **local** so you don’t need cloud APIs or heavy services.

---

## Real AI/ML (optional service)

When the **ML service** is running (`backend/ml-service`), the backend uses:

| Item | Implementation |
|------|-----------------|
| **ML matching model** | **RandomForestRegressor** (scikit-learn) in `backend/ml-service`. Trained on synthetic data; exposes `/predict-eligibility` for score (0–100) and XAI reasons. Node calls it via `ML_SERVICE_URL` (default `http://127.0.0.1:8000`). |
| **NLP (health normalization)** | **NLTK** in the same Python service: tokenization, lemmatization, expanded medical term lists. Exposes `/normalize-health`; returns flags like `recent_illness`, `diabetes`, `anemia`, `bp`, `medication`. |

To use: run `pip install -r requirements.txt && python train_model.py` then `uvicorn main:app --port 8000` in `backend/ml-service`. Set `ML_SERVICE_URL=` (empty) in backend `.env` to disable and use rule-based fallback.

---

## Mocked / minimal (when ML service is off)

| Item | What we do instead | If you want real |
|------|--------------------|-------------------|
| **ML matching model** | Fallback: simple weighted rules in `backend/src/utils/eligibility.js`. | Run the ML service (see above). |
| **NLP (health normalization)** | Fallback: keyword/synonym matching in `backend/src/utils/healthNlp.js`. | Run the ML service (see above). |
| **OCR (blood requisition form)** | **Minimal:** Frontend uses **Tesseract.js** (browser). "Scan requisition" on Request blood page uploads an image, runs OCR, parses text for blood group (A+/B+/etc.) and hospital name, prefills the form. No backend upload. | Server-side Tesseract for higher accuracy or PDF support. |
| **Maps** | **Leaflet + OpenStreetMap** – no API key. Click map (India bounds) to set lat/lng; distance still computed locally (Haversine). | Google Maps / Mapbox for richer tiles or geocoding. |

---

## Local (no cloud)

| Item | Implementation |
|------|----------------|
| **Distance** | **Haversine** in `backend/src/utils/geo.js` – distance in km between (lat, lng) and (lat, lng). No API key. |
| **Database** | **MongoDB** – run locally (`mongod` or Docker). Tests use `mongodb-memory-server`. |
| **Auth** | **JWT** in Node; secret from `.env`. No OAuth or cloud auth. |
| **Frontend API** | Vite proxy sends `/api` to `http://localhost:5000`. No serverless or cloud gateway. |

---

## Summary

- **Mapped:** Geospatial search uses **Haversine** (local). Donors are filtered by blood group, availability, and distance; then ranked by the eligibility score and XAI reasons (from **ML service** when running, else rule-based fallback).
- **NLP:** Health summary → flags via **NLTK** in the ML service when running, else keyword rules; **minimal OCR:** Tesseract.js in browser to prefill request form from a requisition image.
