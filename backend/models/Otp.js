const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  mobile: {
    type: String,
    required: true,
    index: true,
  },
  pan: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    default: Date.now,
    expires: 300, // Auto-delete after 5 minutes (300 seconds)
  },
  attempts: {
    type: Number,
    default: 0,
  },
  verified: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Index for faster lookups
otpSchema.index({ mobile: 1, pan: 1 });

module.exports = mongoose.model('Otp', otpSchema);

