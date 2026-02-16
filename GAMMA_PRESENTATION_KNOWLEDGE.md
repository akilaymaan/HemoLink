# HemoLink – Gamma Presentation Knowledge Prompt

Use this as the knowledge base or context when generating a Gamma presentation for **HemoLink**. Do not mention mocked data, fallbacks, or what is “real vs simulated.” Focus on purpose, value, user flow, and technology.

---

## Project name
**HemoLink**

---

## Why we are making this

- **Blood shortage and discovery gap:** In emergencies, finding a compatible donor nearby is critical. Existing systems are often fragmented, slow, or not location-aware, leading to delayed care and avoidable risk.
- **Trust and transparency:** Donors and seekers need to understand *why* a donor is recommended—not just a score, but clear, human-readable reasons (Explainable AI) so everyone can trust the platform.
- **Inclusive and accessible:** Not everyone can type long health summaries or fill forms quickly. Voice input and optional OCR for requisition forms make the app usable in stressful situations and for diverse users.
- **Data-driven matching:** Not all “available” donors are equally suitable. Time since last donation, distance, current availability, and health factors should be combined intelligently so the best matches surface first.

---

## What is the use of this (value and benefits)

- **For seekers / patients:** Quickly find nearby, eligible donors by blood group and radius; launch **Emergency SOS** requests; see donors ranked by a **suitability score** with **explainable reasons** (e.g. “Donated 6 months ago,” “Within 5 km,” “No conflicting health flags”).
- **For donors:** Register once, set location (map or voice), add a health summary; get visibility when someone in need searches; understand their own **eligibility score** and how it’s calculated.
- **For the system:** Centralized, location-based donor discovery; **ML-powered scoring** so the right donors appear first; **NLP** to turn free-text health summaries into structured flags that affect eligibility; **XAI** so every score comes with clear, natural-language reasons.

---

## How it works (user and system flow)

1. **Registration and roles:** Users register as **donor** or **seeker** (email, password, name). Donors create/update a profile: blood group, city, coordinates (map pin or voice), health summary, availability.
2. **Location:** Donors set location via an interactive map (Leaflet/OpenStreetMap) or by voice; city can be derived by reverse geocoding when they drop a pin.
3. **Eligibility and health:** The system analyzes the donor’s health summary with **NLP** (e.g. recent illness, chronic conditions, serious flags). A **ML model** combines: days since last donation, distance to request, current availability, and health flags to produce a **0–100 suitability score** and **XAI reasons**.
4. **Emergency SOS and matching:** Seekers create blood requests (blood group, location). The app finds donors within a chosen radius, filters by blood group and availability, and ranks them by the **ML suitability score**, showing **XAI reasons** for each.
5. **Optional convenience:** Voice input for donor form (city, health summary); OCR (e.g. Tesseract) to scan requisition images for blood group and hospital details.

---

## Technologies and stack used

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 18, Vite, Tailwind CSS, React Router, Leaflet (OpenStreetMap), Tesseract.js (OCR), Web Speech API (voice) |
| **Backend** | Node.js, Express, MongoDB (Mongoose), JWT authentication |
| **ML / AI service** | Python, FastAPI, scikit-learn (RandomForest), NLTK, optional Google Gemini (NLP and natural-language XAI reasons) |
| **Testing** | Jest + Supertest (backend), Vitest + React Testing Library (frontend), pytest (ML service) |
| **Design** | Neobrutalism UI: bold borders, bright colors, chunky shadows, mobile-first |

**Summary:** Full-stack web app (React + Node + MongoDB) with a separate Python ML service for eligibility scoring, health NLP, and explainable reasons; optional Gemini for richer NLP and XAI; map-based and voice-based UX; test-driven development.

---

## Tone and constraints for the presentation

- **Do not** say which parts are “mocked,” “simulated,” “fallback,” or “real vs local.”
- **Do** emphasize: problem (blood donor discovery), solution (HemoLink), benefits (fast matching, transparency via XAI, accessibility via voice/OCR), and how the stack supports it (React, Node, MongoDB, Python ML, FastAPI, scikit-learn, NLTK, optional Gemini).
- Keep slides clear, benefit-oriented, and suitable for stakeholders or a technical audience without exposing implementation details that suggest “demo only.”
