/**
 * Minimal NLP: normalize free-text health summary to a list of flags for eligibility.
 * Keyword/synonym matching only (no spell correction, no NLTK).
 */
const RULES = [
  {
    flag: 'recent_illness',
    keywords: ['ill', 'sick', 'fever', 'cold', 'cough', 'infection', 'flu', 'unwell', 'recently ill'],
  },
  {
    flag: 'diabetes',
    keywords: ['diabetes', 'diabetic', 'sugar', 'blood sugar', 'glucose'],
  },
  {
    flag: 'anemia',
    keywords: ['anemia', 'anaemia', 'low haemoglobin', 'low hemoglobin', 'hb low'],
  },
  {
    flag: 'bp',
    keywords: ['blood pressure', 'hypertension', 'high bp', 'low bp', 'hypotension'],
  },
  {
    flag: 'medication',
    keywords: ['medication', 'medicines', 'on drugs', 'antibiotics', 'treatment'],
  },
  {
    flag: 'serious_condition',
    keywords: ['cancer', 'chemotherapy', 'hiv', 'aids', 'hepatitis', 'heart disease', 'stroke', 'major surgery', 'leukemia', 'lymphoma', 'tumor', 'malignant'],
  },
];

function normalizeWord(s) {
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * @param {string} healthSummary - Free-text health summary from donor
 * @returns {string[]} - Array of flag strings, e.g. ['recent_illness', 'diabetes']
 */
export function normalizeHealthToFlags(healthSummary) {
  if (!healthSummary || typeof healthSummary !== 'string') return [];
  const text = normalizeWord(healthSummary);
  if (!text) return [];
  const flags = [];
  for (const { flag, keywords } of RULES) {
    if (keywords.some((kw) => text.includes(normalizeWord(kw)))) flags.push(flag);
  }
  return flags;
}
