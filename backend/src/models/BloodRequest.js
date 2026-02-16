import mongoose from 'mongoose';

const bloodRequestSchema = new mongoose.Schema(
  {
    requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bloodGroup: { type: String, required: true, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
    units: { type: Number, default: 1 },
    hospitalName: { type: String },
    hospitalLocation: {
      type: { type: String, default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    city: { type: String },
    urgency: { type: String, enum: ['normal', 'urgent', 'sos'], default: 'normal' },
    status: { type: String, enum: ['open', 'matched', 'closed'], default: 'open' },
    matchedDonors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Donor' }],
  },
  { timestamps: true }
);

export const BloodRequest = mongoose.model('BloodRequest', bloodRequestSchema);
