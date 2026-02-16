import { Router } from 'express';
import { Donor } from '../models/Donor.js';
import { User } from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';
import { haversineKm } from '../utils/geo.js';
import { getEligibilityFromML, getHealthFlagsFromML, getEligibilityOverrideFromML } from '../services/mlClient.js';

const router = Router();

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { bloodGroup, city, lat, lng, isAvailableNow, lastDonationDate, healthSummary } = req.body;
    if (!bloodGroup) return res.status(400).json({ error: 'bloodGroup required' });
    let donor = await Donor.findOne({ user: req.user._id });
    const coords = lng != null && lat != null ? [Number(lng), Number(lat)] : [0, 0];
    if (donor) {
      donor.bloodGroup = bloodGroup;
      donor.city = city;
      donor.location.coordinates = coords;
      donor.isAvailableNow = isAvailableNow ?? donor.isAvailableNow;
      donor.lastDonationDate = lastDonationDate ? new Date(lastDonationDate) : donor.lastDonationDate;
      donor.healthSummary = healthSummary ?? donor.healthSummary;
      await donor.save();
    } else {
      donor = await Donor.create({
        user: req.user._id,
        bloodGroup,
        city,
        location: { type: 'Point', coordinates: coords },
        isAvailableNow: !!isAvailableNow,
        lastDonationDate: lastDonationDate ? new Date(lastDonationDate) : undefined,
        healthSummary,
      });
    }
    const populated = await Donor.findById(donor._id).populate('user', 'name email');
    res.json(populated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const donor = await Donor.findOne({ user: req.user._id }).populate('user', 'name email').lean();
    if (!donor) return res.json({ donor: null });
    const override = await getEligibilityOverrideFromML(donor.healthSummary);
    if (override.override) {
      return res.json({
        donor: {
          ...donor,
          eligibilityScore: override.score,
          xaiReasons: [override.reason],
        },
      });
    }
    const now = new Date();
    const lastDon = donor.lastDonationDate ? new Date(donor.lastDonationDate) : null;
    const daysSince = lastDon ? Math.floor((now - lastDon) / (1000 * 60 * 60 * 24)) : 999;
    const distanceKm = 0;
    const healthFlags = await getHealthFlagsFromML(donor.healthSummary);
    const { score, reasons } = await getEligibilityFromML({
      daysSinceLastDonation: daysSince,
      distanceKm,
      isAvailableNow: donor.isAvailableNow,
      healthFlags,
      healthSummary: donor.healthSummary,
    });
    res.json({
      donor: {
        ...donor,
        eligibilityScore: score,
        xaiReasons: reasons,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { bloodGroup, city, lat, lng, radiusKm = 50, availableOnly } = req.query;
    const filter = {};
    if (bloodGroup) filter.bloodGroup = bloodGroup;
    if (city) filter.city = new RegExp(city, 'i');
    if (availableOnly === 'true') filter.isAvailableNow = true;

    let donors = await Donor.find(filter).populate('user', 'name email phone').lean();
    const latN = lat != null ? Number(lat) : null;
    const lngN = lng != null ? Number(lng) : null;
    const radius = Number(radiusKm) || 50;

    if (latN != null && lngN != null) {
      donors = donors
        .map((d) => {
          const [dlng, dlat] = d.location?.coordinates || [0, 0];
          const dist = haversineKm(dlat, dlng, latN, lngN);
          return { ...d, _distanceKm: dist };
        })
        .filter((d) => d._distanceKm <= radius)
        .sort((a, b) => a._distanceKm - b._distanceKm);
    }

    const now = new Date();
    const withScore = await Promise.all(
      donors.map(async (d) => {
        const override = await getEligibilityOverrideFromML(d.healthSummary);
        if (override.override) {
          return {
            ...d,
            eligibilityScore: override.score,
            xaiReasons: [override.reason],
            distanceKm: d._distanceKm != null ? Math.round(d._distanceKm * 10) / 10 : null,
          };
        }
        const lastDon = d.lastDonationDate ? new Date(d.lastDonationDate) : null;
        const daysSince = lastDon ? Math.floor((now - lastDon) / (1000 * 60 * 60 * 24)) : 999;
        const dist = d._distanceKm ?? 999;
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
          distanceKm: d._distanceKm != null ? Math.round(d._distanceKm * 10) / 10 : null,
        };
      })
    );

    res.json(withScore);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
