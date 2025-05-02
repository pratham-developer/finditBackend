import mongoose from "mongoose";

const claimRequestSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },
  qrCode: { 
    token: { type: String },
    expiresAt: { type: Date },
    issuedAt: { type: Date }
  },
  message: { type: String },
  // Tracking when the item was actually handed over
  completedAt: { type: Date }
}, { timestamps: true });

export const ClaimRequest = mongoose.model('ClaimRequest', claimRequestSchema, 'claimRequests');
