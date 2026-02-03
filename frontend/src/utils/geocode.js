/**
 * Reverse geocode lat/lng to city name using OpenStreetMap Nominatim (no API key).
 * Usage policy: https://operations.osmfoundation.org/policies/nominatim/
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = 'HemoLink/1.0 (blood donor app)';

/**
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<string|null>} City name (or town/village) or null
 */
export async function reverseGeocode(lat, lng) {
  const latN = Number(lat);
  const lngN = Number(lng);
  if (Number.isNaN(latN) || Number.isNaN(lngN)) return null;
  try {
    const params = new URLSearchParams({
      lat: String(latN),
      lon: String(lngN),
      format: 'json',
      addressdetails: '1',
    });
    const res = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data?.address;
    if (!addr) return null;
    return (
      addr.city ||
      addr.town ||
      addr.village ||
      addr.county ||
      addr.state_district ||
      addr.state ||
      null
    );
  } catch {
    return null;
  }
}
