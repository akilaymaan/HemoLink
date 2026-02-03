import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Tesseract from 'tesseract.js';
import { requestMatch, requestCreate } from '../api';
import { useAuth } from '../context/AuthContext';
import { LocationPicker } from '../components/LocationPicker';
import { XAIReasons } from '../components/XAIReasons';
import { parseRequisitionText } from '../utils/ocrRequisition';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export function RequestBlood() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radiusKm, setRadiusKm] = useState(25);
  const [hospitalName, setHospitalName] = useState('');
  const [urgency, setUrgency] = useState('sos');
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleScanRequisition = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrLoading(true);
    try {
      const { data } = await Tesseract.recognize(file, 'eng');
      const { bloodGroup: bg, hospitalName: hn } = parseRequisitionText(data.text);
      if (bg) setBloodGroup(bg);
      if (hn) setHospitalName(hn);
    } catch (err) {
      alert('OCR failed: ' + (err.message || 'Could not read image'));
    } finally {
      setOcrLoading(false);
      e.target.value = '';
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const data = await requestMatch({
        bloodGroup,
        lat: lat || undefined,
        lng: lng || undefined,
        radiusKm,
      });
      setResult(data);
    } catch (err) {
      alert(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setLoading(true);
    try {
      await requestCreate({
        bloodGroup,
        units: 1,
        hospitalName: hospitalName || undefined,
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined,
        urgency,
      });
      const data = await requestMatch({ bloodGroup, lat: lat || undefined, lng: lng || undefined, radiusKm });
      setResult(data);
    } catch (err) {
      alert(err.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold border-4 border-black inline-block px-4 py-2 bg-[#FF6B6B] text-white shadow-[4px_4px_0_0_#000] mb-6">
        Emergency SOS – Find donors
      </h1>
      <form onSubmit={handleSearch} className="card-nb space-y-4 mb-8">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[140px]">
            <label className="block font-bold mb-1">Blood group needed</label>
            <select
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              className="input-nb"
            >
              {BLOOD_GROUPS.map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleScanRequisition}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={ocrLoading}
              className="text-sm font-semibold border-2 border-black px-3 py-2 bg-[#C9B1FF] shadow-[2px_2px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-60"
            >
              {ocrLoading ? 'Scanning…' : 'Scan requisition'}
            </button>
          </div>
        </div>
        <LocationPicker
          label="Hospital / search location (India) – search or click map"
          lat={lat || undefined}
          lng={lng || undefined}
          onSelect={(newLat, newLng) => {
            setLat(newLat !== undefined && newLat !== null && newLat !== '' ? String(newLat) : '');
            setLng(newLng !== undefined && newLng !== null && newLng !== '' ? String(newLng) : '');
          }}
          showRadius
          radiusKm={radiusKm}
          onRadiusChange={setRadiusKm}
        />
        <div>
          <label className="block font-bold mb-1">Hospital name (optional)</label>
          <input
            type="text"
            value={hospitalName}
            onChange={(e) => setHospitalName(e.target.value)}
            className="input-nb"
            placeholder="City Hospital"
          />
        </div>
        <div>
          <label className="block font-bold mb-1">Urgency</label>
          <select
            value={urgency}
            onChange={(e) => setUrgency(e.target.value)}
            className="input-nb"
          >
            <option value="sos">SOS – Emergency</option>
            <option value="urgent">Urgent</option>
            <option value="normal">Normal</option>
          </select>
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-nb btn-nb-danger">
            {loading ? 'Searching…' : 'Find donors'}
          </button>
          {user && (
            <button type="button" onClick={handleCreateRequest} disabled={loading} className="btn-nb btn-nb-primary">
              Save request & find
            </button>
          )}
        </div>
      </form>
      {result && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold border-2 border-black inline-block px-3 py-1 bg-[#4ECDC4]">
              Matched donors ({result.donors?.length ?? 0})
            </h2>
            <span className="text-xs border-2 border-black px-2 py-1 bg-[#FFE66D] font-semibold">Ranked by AI/ML</span>
          </div>
          <p className="text-sm text-black/70">Each donor has an <strong>ML suitability score</strong> and <strong>Explainable AI (XAI)</strong> reasons.</p>
          {result.donors?.length === 0 ? (
            <p className="card-nb">No donors found in range. Try widening location or check O- as universal.</p>
          ) : (
            <ul className="space-y-4 list-none p-0 m-0">
              {result.donors.map((d) => (
                <li key={d._id} className="card-nb">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold">{d.user?.name ?? 'Donor'}</span>
                    <span className="border-2 border-black px-2 py-0.5 bg-[#FFE66D] font-bold">{d.bloodGroup}</span>
                  </div>
                  {d.distanceKm != null && (
                    <p className="text-sm mt-1">{d.distanceKm} km away</p>
                  )}
                  <div className="mt-2">
                    <span className="font-bold text-sm">ML suitability score: </span>
                    <span className="font-bold">{d.eligibilityScore}%</span>
                  </div>
                  {d.xaiReasons?.length > 0 && (
                    <XAIReasons reasons={d.xaiReasons} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
