# ML Implementation in HemoLink — What It Does & How to Improve

This document explains the **actual ML/NLP implementation** in the project and **concrete ways to make it better** for a teacher or reviewer.

---

## 1. What the ML Implementation Actually Does

The ML service (`backend/ml-service`) is a **Python FastAPI app** that provides two things: **donor eligibility scoring** (ML) and **health text → flags** (NLP). The Node backend calls it over HTTP; if the service is down, it falls back to simple rule-based logic.

### 1.1 Eligibility scoring (ML part)

| What | How it works |
|------|-------------------------------|
| **Model** | **RandomForestRegressor** (scikit-learn), 100 trees, max depth 8. |
| **Inputs (4 features)** | `days_since_last_donation`, `distance_km`, `is_available_now`, `health_flag_count`. |
| **Output** | A **score 0–100** (how suitable a donor is for a request). |
| **Training** | **Synthetic data only**: we generate 5000 samples with random feature values and label each sample using a **fixed rule-based formula** (same logic as the original `eligibility.js`). So the model is trained to *approximate* those rules. |
| **Preprocessing** | Features are **standard-scaled** (zero mean, unit variance) before training and at prediction time. |
| **Where it runs** | `train_model.py` trains and saves the model; `eligibility_service.py` loads it and exposes `compute_score_and_reasons()`. The FastAPI endpoint is **POST /predict-eligibility**. |

So in practice: **the “ML” here is a Random Forest that was trained to mimic our hand-written rules**. The score is produced by the model; the **XAI reasons** (e.g. “Eligible by donation gap”, “Proximity match”) are still **rule-based** in code, not derived from the model’s internal structure (e.g. SHAP/tree interpreter).

### 1.2 Health text → flags (NLP part)

| What | How it works |
|------|-------------------------------|
| **Goal** | Turn a donor’s free-text health summary (e.g. “I had fever last week, on antibiotics”) into a list of **flags** used for eligibility: `recent_illness`, `diabetes`, `anemia`, `bp`, `medication`. |
| **Pipeline** | 1) **Tokenize** (NLTK `word_tokenize`), 2) **POS tag** (NLTK averaged_perceptron_tagger), 3) **Lemmatize** (WordNet lemmatizer with POS), 4) **Match** tokens and 2–3 word phrases against a fixed **medical term list** per flag. |
| **Term lists** | Each flag has a list of keywords/synonyms (e.g. for `diabetes`: “diabetes”, “diabetic”, “sugar”, “glucose”, “blood sugar”, …). If any term (or its lemma) appears in the text or in the token set, that flag is set. |
| **Where it runs** | `nlp_health.py`; FastAPI endpoint **POST /normalize-health** with `{ "text": "..." }` returns `{ "flags": ["recent_illness", "medication", ...] }`. |

So the **NLP** is: **NLTK tokenization + lemmatization + rule-based keyword/phrase matching** against curated term lists. There is **no** learned classifier (no trained model) for the flags; it’s pattern matching on normalized text.

### 1.3 End-to-end flow (for the teacher)

1. **Donor listing / request matching (Node)**  
   For each donor, the backend:  
   - Gets **health flags** by calling the ML service **POST /normalize-health** with the donor’s `healthSummary` (or falls back to keyword rules).  
   - Computes **eligibility score + reasons** by calling **POST /predict-eligibility** with `daysSinceLastDonation`, `distanceKm`, `isAvailableNow`, `healthFlags` (or falls back to rule-based score + reasons).  
2. **ML service (Python)**  
   - **Normalize-health**: NLTK tokenize + lemmatize + term lists → `flags`.  
   - **Predict-eligibility**: build feature vector → scale → Random Forest predict → clip to 0–100; then attach rule-based XAI reasons.  
3. **Result**  
   Donors are sorted by this score and the UI can show the “XAI” reasons.

So we can say: we **implemented**  
- a **real ML model** (Random Forest) for the numeric score,  
- and **real NLP** (NLTK tokenization + lemmatization) for normalizing health text to flags,  
with a clear **fallback** when the service is unavailable.

### 1.4 Gemini API (optional upgrade)

When **GEMINI_API_KEY** is set in the ML service environment:

| Feature | With Gemini | Without (fallback) |
|--------|---------------------|----------------------|
| **Health text → flags** | **Gemini** interprets the summary and returns only the allowed flags (`recent_illness`, `diabetes`, `anemia`, `bp`, `medication`). Handles typos and paraphrases. | NLTK tokenize + lemmatize + keyword lists. |
| **XAI reasons** | **Gemini** generates 3–5 short, natural-language reasons from the score and the four feature values (days since donation, distance, available now, health flag count). | Fixed rule-based sentences. |

Implementation: `gemini_client.py` uses the `google-generativeai` SDK, prompts Gemini with strict JSON output (e.g. `{"flags": [...]}` or `{"reasons": [...]}`), and parses the response. If the key is missing or the API fails, the service falls back to NLTK and rule-based reasons with no error to the user.

---

## 2. How This Can Be Better for the Project

Below are **concrete improvements** you can describe to your teacher as “next steps” or “future work”.

### 2.1 Use real data instead of synthetic labels

- **Now:** The model is trained on **synthetic data** labeled with a fixed formula.  
- **Better:** Train on **real historical data** (e.g. which donors were actually selected / responded / were deemed suitable). Then the target could be binary (matched/not) or a human-assigned suitability score.  
- **Impact:** The model would learn **real** patterns (e.g. time-of-day, geography, specific health flags) instead of just approximating our rules.

### 2.2 Model-based explainability (true XAI)

- **Now:** XAI reasons are **hand-written rules** (if days ≥ 90 then “Eligible by donation gap”, etc.), not from the model.  
- **Better:** Use **SHAP** (or tree interpreter) on the Random Forest to get **per-prediction feature contributions**. Then turn those into short sentences (e.g. “Distance (5 km) increased score by +12”).  
- **Impact:** Explanations would reflect **what the model actually used** for that donor, which is more transparent and educational.

### 2.3 Train a classifier for health flags (real NLP model)

- **Now:** Health flags come from **keyword + lemmatization** matching only.  
- **Better:** Build a **small labeled dataset** (e.g. 500–1000 sentences with flags). Train a **text classifier** (e.g. simple BERT-based or a small transformer / logistic regression on TF-IDF or embeddings). Use it to predict the five flags (multi-label).  
- **Impact:** Better handling of **typos**, **paraphrases**, and **new phrasing** without manually adding every synonym.

### 2.4 Richer features and a better target

- **Now:** Only 4 features; target is a rule-based score.  
- **Better:** Add features such as: time since last donation **squared**, log(distance), hour/day of request, blood group compatibility level, number of previous donations, etc. If we have outcomes, predict **actual match success** or **donor response** instead of a hand-crafted score.  
- **Impact:** A more informative model that can capture non-linear and interaction effects.

### 2.5 Validation and monitoring

- **Now:** No explicit validation pipeline or monitoring.  
- **Better:**  
  - **Offline:** Train/validation split, cross-validation, metrics (e.g. MSE/MAE for score; precision/recall/F1 for flags if we have a classifier).  
  - **Online:** Log predictions and, when possible, outcomes; periodically retrain and A/B test.  
- **Impact:** Ensures the model generalizes and stays useful over time.

### 2.6 Optional: spell correction and medical vocabulary

- **Now:** No spell correction; term lists are general.  
- **Better:** Add a **spell-checker** (e.g. SymSpell, or a small corrector) and optionally a **medical NER or ontology** (e.g. UMLS, or a small fine-tuned model) to normalize terms.  
- **Impact:** More robust to typos and varied medical wording.

---

## 3. One-paragraph summary for the teacher

**What we implemented:** We added a Python ML service used by the Node backend. It (1) scores donor–request suitability (0–100) with a **Random Forest** trained on synthetic data that mimics our original rules, and (2) converts free-text health summaries into eligibility flags using **NLTK** (tokenization, lemmatization) and **keyword matching** against medical term lists. The service is optional: if it’s down, the app falls back to rule-based logic. So we have a **real ML model** for the score and **real NLP preprocessing** for health text, with a clear path to improve by using real data, SHAP-based explanations, a trained NLP classifier for flags, and better features and validation.

You can use this file as-is to show your teacher what the ML implementation actually does and how the project can be improved.
