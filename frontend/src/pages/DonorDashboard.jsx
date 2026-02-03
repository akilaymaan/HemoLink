import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { donorMe, donorCreateOrUpdate } from '../api';
import { EligibilityGauge } from '../components/EligibilityGauge';
import { LocationPicker } from '../components/LocationPicker';
import { VoiceInputButton } from '../components/VoiceInputButton';
import { reverseGeocode } from '../utils/geocode';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export function DonorDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    bloodGroup: 'O+',
    city: '',
    lat: '',
    lng: '',
    isAvailableNow: false,
    lastDonationDate: '',
    healthSummary: '',
  });
  const [cityLoading, setCityLoading] = useState(false);
  const [scoreJustUpdated, setScoreJustUpdated] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    donorMe()
      .then((p) => {
        setProfile(p);
        if (p) {
          setForm({
            bloodGroup: p.bloodGroup || 'O+',
            city: p.city || '',
            lat: p.location?.coordinates?.[1] ?? '',
            lng: p.location?.coordinates?.[0] ?? '',
            isAvailableNow: p.isAvailableNow ?? false,
            lastDonationDate: p.lastDonationDate ? p.lastDonationDate.slice(0, 10) : '',
            healthSummary: p.healthSummary || '',
          });
        }
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setScoreJustUpdated(false);
    try {
      const body = {
        bloodGroup: form.bloodGroup,
        city: form.city || undefined,
        lat: form.lat ? Number(form.lat) : undefined,
        lng: form.lng ? Number(form.lng) : undefined,
        isAvailableNow: form.isAvailableNow,
        lastDonationDate: form.lastDonationDate || undefined,
        healthSummary: form.healthSummary || undefined,
      };
      await donorCreateOrUpdate(body);
      const fresh = await donorMe();
      setProfile(fresh);
      setScoreJustUpdated(true);
      setTimeout(() => setScoreJustUpdated(false), 3000);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) return <div className="font-bold">Loading…</div>;
  if (!user) return null;

  // Client-side rough score when API doesn't return it (from lastDonationDate + isAvailableNow)
  let displayScore = profile?.eligibilityScore;
  if (displayScore == null && profile) {
    const lastDon = profile.lastDonationDate ? new Date(profile.lastDonationDate) : null;
    const daysSince = lastDon ? Math.floor((Date.now() - lastDon) / (1000 * 60 * 60 * 24)) : 999;
    displayScore = profile.isAvailableNow && daysSince >= 90 ? 85 : profile.isAvailableNow ? 60 : 40;
  }
  const verdict = displayScore >= 80 ? 'Safe to Request' : displayScore >= 50 ? 'Moderate' : 'Recently donated / check';

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold border-4 border-black inline-block px-4 py-2 bg-[#95E1A3] shadow-[4px_4px_0_0_#000] mb-6">
        Donor profile
      </h1>
      {saving && (
        <div className="mb-6 card-nb border-2 border-[#C9B1FF] bg-[#C9B1FF]/20 p-4 flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin shrink-0" aria-hidden />
          <div>
            <p className="font-bold text-black">AI is evaluating your eligibility</p>
            <p className="text-sm text-black/70">Running ML model inference (NLP + scoring)…</p>
          </div>
        </div>
      )}
      {(profile?.eligibilityScore != null || displayScore != null) && !saving && (
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <p className="text-sm text-black/70">Your profile is scored by our <strong>ML model</strong> (donation gap, distance, availability, health flags).</p>
            {scoreJustUpdated && (
              <span className="text-xs font-bold border-2 border-black px-2 py-0.5 bg-[#95E1A3] animate-pulse">
                Score updated
              </span>
            )}
          </div>
          <EligibilityGauge score={displayScore ?? profile?.eligibilityScore} verdict={verdict} />
        </div>
      )}
      {(profile?.eligibilityScore != null || displayScore != null) && saving && (
        <div className="mb-6 card-nb p-4 opacity-60">
          <div className="text-sm font-bold uppercase text-black/70">ML suitability score</div>
          <div className="text-xs text-black/60 mt-1">Computing…</div>
          <div className="mt-2 h-6 border-[3px] border-black bg-gray-200 overflow-hidden">
            <div className="h-full w-1/3 bg-[#C9B1FF] animate-pulse" style={{ minWidth: 4 }} />
          </div>
          <div className="mt-2 text-2xl font-bold text-black/50">—%</div>
        </div>
      )}
      <form onSubmit={handleSubmit} className="card-nb space-y-4">
        <div>
          <label className="block font-bold mb-1">Blood group</label>
          <select
            value={form.bloodGroup}
            onChange={(e) => setForm((f) => ({ ...f, bloodGroup: e.target.value }))}
            className="input-nb"
          >
            {BLOOD_GROUPS.map((bg) => (
              <option key={bg} value={bg}>{bg}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-bold mb-1">City</label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              className="input-nb flex-1 min-w-[180px]"
              placeholder="Set by map pin, voice, or type here"
            />
            <VoiceInputButton
              onResult={(text) => setForm((f) => ({ ...f, city: text }))}
              title="Say your city name"
            />
            {cityLoading && <span className="text-xs text-black/60">Looking up city…</span>}
          </div>
        </div>
        <LocationPicker
          label="Your location (India) – click map to pin; city is set automatically"
          lat={form.lat || undefined}
          lng={form.lng || undefined}
          onSelect={(lat, lng) => setForm((f) => ({
            ...f,
            lat: lat !== undefined && lat !== null && lat !== '' ? String(lat) : '',
            lng: lng !== undefined && lng !== null && lng !== '' ? String(lng) : '',
          }))}
          onMapSelect={async (latNum, lngNum) => {
            setCityLoading(true);
            try {
              const city = await reverseGeocode(latNum, lngNum);
              if (city) setForm((f) => ({ ...f, city }));
            } finally {
              setCityLoading(false);
            }
          }}
        />
        <div>
          <label className="block font-bold mb-1">Last donation date</label>
          <input
            type="date"
            value={form.lastDonationDate}
            onChange={(e) => setForm((f) => ({ ...f, lastDonationDate: e.target.value }))}
            className="input-nb"
          />
        </div>
        <div>
          <label className="block font-bold mb-1">Health summary (optional)</label>
          <p className="text-xs text-black/60 mb-1">Analyzed by <strong>NLP</strong> for eligibility (e.g. recent illness, diabetes, medication). Use voice for faster filling.</p>
          <div className="flex flex-wrap items-start gap-2">
            <input
              type="text"
              value={form.healthSummary}
              onChange={(e) => setForm((f) => ({ ...f, healthSummary: e.target.value }))}
              className="input-nb flex-1 min-w-[200px]"
              placeholder="e.g. No illness, or: had fever last week"
            />
            <VoiceInputButton
              onResult={(text) => setForm((f) => ({ ...f, healthSummary: (f.healthSummary || '').trim() ? `${(f.healthSummary || '').trim()} ${text}` : text }))}
              continuous
              title="Dictate health summary (click again for more)"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 font-bold cursor-pointer">
          <input
            type="checkbox"
            checked={form.isAvailableNow}
            onChange={(e) => setForm((f) => ({ ...f, isAvailableNow: e.target.checked }))}
            className="w-5 h-5 border-2 border-black"
          />
          I am available to donate now
        </label>
        <button type="submit" disabled={saving} className="btn-nb btn-nb-primary flex items-center justify-center gap-2">
          {saving ? (
            <>
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden />
              Running ML inference…
            </>
          ) : (
            'Save profile'
          )}
        </button>
      </form>
    </div>
  );
}
