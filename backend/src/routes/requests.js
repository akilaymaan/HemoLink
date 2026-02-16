import { Router } from 'express';
import { BloodRequest } from '../models/BloodRequest.js';
import { Donor } from '../models/Donor.js';
import { authMiddleware } from '../middleware/auth.js';
import { haversineKm } from '../utils/geo.js';
import { getEligibilityFromML, getHealthFlagsFromML, getEligibilityOverrideFromML } from '../services/mlClient.js';

const router = Router();

const BLOOD_COMPATIBLE = {
  'O-': ['O-'],
  'O+': ['O+', 'O-'],
  'A-': ['A-', 'O-'],
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'],
};

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { bloodGroup, units, hospitalName, lat, lng, city, urgency } = req.body;
    if (!bloodGroup) return res.status(400).json({ error: 'bloodGroup required' });
    const coords = lng != null && lat != null ? [Number(lng), Number(lat)] : [0, 0];
    const request = await BloodRequest.create({
      requester: req.user._id,
      bloodGroup,
      units: units || 1,
      hospitalName,
      hospitalLocation: { type: 'Point', coordinates: coords },
      city,
      urgency: urgency || 'normal',
    });
    const populated = await BloodRequest.findById(request._id).populate('requester', 'name email');
    res.status(201).json(populated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/match', async (req, res) => {
  try {
    const { requestId, lat, lng, bloodGroup, radiusKm } = req.query;
    let hospitalLat = lat != null ? Number(lat) : null;
    let hospitalLng = lng != null ? Number(lng) : null;
    const radius = radiusKm != null ? Number(radiusKm) : 50;
    let needGroup = bloodGroup;

    if (requestId) {
      const reqDoc = await BloodRequest.findById(requestId).lean();
      if (!reqDoc) return res.status(404).json({ error: 'Request not found' });
      const [lngR, latR] = reqDoc.hospitalLocation?.coordinates || [0, 0];
      hospitalLat = latR;
      hospitalLng = lngR;
      needGroup = reqDoc.bloodGroup;
    }
    if (!needGroup) return res.status(400).json({ error: 'bloodGroup or requestId required' });

    const allowed = BLOOD_COMPATIBLE[needGroup] || [needGroup];
    const donors = await Donor.find({
      bloodGroup: { $in: allowed },
      isAvailableNow: true,
    })
      .populate('user', 'name email phone')
      .lean();

    const now = new Date();
    const withScore = await Promise.all(
      donors.map(async (d) => {
        const override = await getEligibilityOverrideFromML(d.healthSummary);
        if (override.override) {
          const [dlng, dlat] = d.location?.coordinates || [0, 0];
          const dist = hospitalLat != null && hospitalLng != null
            ? haversineKm(dlat, dlng, hospitalLat, hospitalLng)
            : 999;
          return {
            ...d,
            eligibilityScore: override.score,
            xaiReasons: [override.reason],
            distanceKm: Math.round(dist * 10) / 10,
            compatibleAs: d.bloodGroup,
          };
        }
        const [dlng, dlat] = d.location?.coordinates || [0, 0];
        const dist = hospitalLat != null && hospitalLng != null
          ? haversineKm(dlat, dlng, hospitalLat, hospitalLng)
          : 999;
        const lastDon = d.lastDonationDate ? new Date(d.lastDonationDate) : null;
        const daysSince = lastDon ? Math.floor((now - lastDon) / (1000 * 60 * 60 * 24)) : 999;
        const healthFlags = await getHealthFlagsFromML(d.healthSummary);
        const { score, reasons } = await getEligibilityFromML({
          daysSinceLastDonation: daysSince,
          distanceKm: dist,
          isAvailableNow: d.isAvailableNow,
          healthFlags,
          healthSummary: d.healthSummary,
        });
        return {
          ...d,
          eligibilityScore: score,
          xaiReasons: reasons,
          distanceKm: Math.round(dist * 10) / 10,
          compatibleAs: d.bloodGroup,
        };
      })
    );

    const withinRadius = radius > 0
      ? withScore.filter((d) => d.distanceKm <= radius)
      : withScore;
    withinRadius.sort((a, b) => b.eligibilityScore - a.eligibilityScore);
    res.json({ donors: withinRadius });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  const list = await BloodRequest.find({ requester: req.user._id })
    .sort({ createdAt: -1 })
    .lean();
  res.json(list);
});

export default router;
