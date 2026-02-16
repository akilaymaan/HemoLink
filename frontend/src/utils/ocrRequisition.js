/**
 * Minimal OCR parsing: extract blood group and hospital name from requisition text.
 */
const BLOOD_GROUP_REGEX = /\b(AB|A|B|O)[+-]\b/i;
const VALID_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export function parseRequisitionText(text) {
  if (!text || typeof text !== 'string') return { bloodGroup: null, hospitalName: null, units: null };
  const t = text.trim();
  const bloodGroupMatch = t.match(BLOOD_GROUP_REGEX);
  const bloodGroup = bloodGroupMatch
    ? `${bloodGroupMatch[1].toUpperCase()}${bloodGroupMatch[0].slice(-1)}`
    : null;
  const validGroup = bloodGroup && VALID_GROUPS.includes(bloodGroup) ? bloodGroup : null;

  let hospitalName = null;
  const lines = t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const hospitalLine = lines.find((l) => /hospital|medical|centre|center/i.test(l));
  if (hospitalLine) hospitalName = hospitalLine.replace(/\s+/g, ' ').slice(0, 100);
  else if (lines.length > 0) hospitalName = lines[0].slice(0, 100);

  const unitsMatch = t.match(/\b(\d+)\s*unit/i);
  const units = unitsMatch ? parseInt(unitsMatch[1], 10) : null;

  return { bloodGroup: validGroup, hospitalName, units };
}
