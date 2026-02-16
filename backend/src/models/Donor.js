import mongoose from 'mongoose';

const donorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    bloodGroup: { type: String, required: true, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
    lastDonationDate: { type: Date },
    location: {
      type: { type: String, default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },
    city: { type: String, trim: true },
    isAvailableNow: { type: Boolean, default: false },
    healthSummary: { type: String },
    eligibilityScore: { type: Number },
  },
  { timestamps: true }
);

donorSchema.index({ location: '2dsphere' });
donorSchema.index({ bloodGroup: 1, isAvailableNow: 1 });

export const Donor = mongoose.model('Donor', donorSchema);
