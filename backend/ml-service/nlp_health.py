"""
NLP health normalizer: tokenize, lemmatize, and map free text to eligibility flags
using NLTK and an expanded medical term list.
"""
import re
import string
from typing import List

# Lazy init NLTK resources
_nltk_ready = False


def _ensure_nltk():
    global _nltk_ready
    if _nltk_ready:
        return
    import nltk
    try:
        nltk.data.find("tokenizers/punkt_tab")
    except LookupError:
        nltk.download("punkt_tab", quiet=True)
    try:
        nltk.data.find("corpora/wordnet")
    except LookupError:
        nltk.download("wordnet", quiet=True)
    try:
        nltk.data.find("taggers/averaged_perceptron_tagger_eng")
    except LookupError:
        nltk.download("averaged_perceptron_tagger_eng", quiet=True)
    _nltk_ready = True


# Flag -> list of terms (lemmas/synonyms) to match
HEALTH_TERMS = {
    "recent_illness": [
        "ill", "illness", "sick", "sickness", "fever", "cold", "cough", "infection",
        "infect", "flu", "unwell", "recently", "virus", "feverish", "running nose",
        "sore throat", "cold", "weak", "unwell",
    ],
    "diabetes": [
        "diabetes", "diabetic", "sugar", "glucose", "blood sugar", "hyperglycemia",
        "hypoglycemia", "insulin", "prediabetic",
    ],
    "anemia": [
        "anemia", "anaemia", "haemoglobin", "hemoglobin", "hb", "low iron", "iron",
        "deficient", "thalassemia",
    ],
    "bp": [
        "blood pressure", "hypertension", "hypertensive", "hypotension", "bp",
        "high bp", "low bp", "pressure",
    ],
    "medication": [
        "medication", "medicine", "medicines", "drug", "drugs", "antibiotic",
        "antibiotics", "treatment", "prescription", "taking", "on drugs", "tablet",
        "injection",
    ],
    "serious_condition": [
        "cancer", "chemotherapy", "hiv", "aids", "hepatitis", "heart disease", "stroke",
        "major surgery", "leukemia", "lymphoma", "tumor", "malignant", "oncology",
    ],
}


def _normalize_word(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip().lower()


def _tokenize_and_lemmatize(text: str) -> List[str]:
    _ensure_nltk()
    from nltk.tokenize import word_tokenize
    from nltk.stem import WordNetLemmatizer
    from nltk.corpus import wordnet
    from nltk import pos_tag

    text = _normalize_word(text)
    if not text:
        return []
    # Remove punctuation for tokenization
    for c in string.punctuation:
        text = text.replace(c, " ")
    tokens = word_tokenize(text)
    lemmatizer = WordNetLemmatizer()

    def pos_to_wn(tag: str):
        if tag.startswith("J"):
            return wordnet.ADJ
        if tag.startswith("V"):
            return wordnet.VERB
        if tag.startswith("N"):
            return wordnet.NOUN
        if tag.startswith("R"):
            return wordnet.ADV
        return wordnet.NOUN

    tagged = pos_tag(tokens)
    lemmas = []
    for word, tag in tagged:
        w = word.lower()
        if not w.isalnum() or len(w) < 2:
            continue
        lem = lemmatizer.lemmatize(w, pos=pos_to_wn(tag))
        lemmas.append(lem)
        if lem != w:
            lemmas.append(w)
    return list(set(lemmas))


def _normalize_health_to_flags_nltk(health_summary: str) -> List[str]:
    """NLTK + keyword-based extraction (fallback when Gemini is not used)."""
    text = _normalize_word(health_summary)
    if not text:
        return []
    tokens_and_phrases = _tokenize_and_lemmatize(health_summary)
    words = text.split()
    for i in range(len(words)):
        for n in (2, 3):
            if i + n <= len(words):
                phrase = " ".join(words[i : i + n])
                tokens_and_phrases.append(phrase)
    tokens_set = set(tokens_and_phrases)
    flags = []
    for flag, terms in HEALTH_TERMS.items():
        for term in terms:
            t_norm = _normalize_word(term)
            if t_norm in tokens_set or t_norm in text:
                flags.append(flag)
                break
    return list(dict.fromkeys(flags))


def normalize_health_to_flags(health_summary: str) -> List[str]:
    """
    Map free-text health summary to eligibility flags.
    Uses Gemini when GEMINI_API_KEY is set; otherwise NLTK + keyword matching.
    """
    if not health_summary or not isinstance(health_summary, str):
        return []
    text = _normalize_word(health_summary)
    if not text:
        return []
    try:
        from gemini_client import generate_health_flags_with_gemini
        gemini_flags = generate_health_flags_with_gemini(health_summary)
        if gemini_flags is not None:
            return gemini_flags
    except Exception:
        pass
    return _normalize_health_to_flags_nltk(health_summary)
