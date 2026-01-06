const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  clientId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: false, // Email is optional
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    default: '',
  },
  companyName: {
    type: String,
    default: '',
  },
  address: {
    type: String,
    default: '',
  },
  city: {
    type: String,
    default: '',
  },
  state: {
    type: String,
    default: '',
  },
  pincode: {
    type: String,
    default: '',
  },
  pan: {
    type: String,
    default: '',
  },
  aadhar: {
    type: String,
    default: '',
  },
  gstin: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null, // Will be set when client creates login
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update updatedAt and normalize PAN before saving
clientSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  
  // Normalize PAN to uppercase
  if (this.pan) {
    this.pan = this.pan.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
  }
  
  // Normalize phone to last 10 digits
  if (this.phone) {
    this.phone = this.phone.replace(/[^\d]/g, '').slice(-10);
  }
  
  // Normalize email - convert to lowercase and trim
  if (this.email !== undefined && this.email !== null) {
    const emailStr = String(this.email).trim();
    if (emailStr.length === 0) {
      // Remove email field if empty
      delete this.email;
      this.set('email', undefined, { strict: false });
    } else {
      this.email = emailStr.toLowerCase();
    }
  } else {
    // If email is already undefined/null, ensure it's completely omitted
    delete this.email;
  }
  
  next();
});

module.exports = mongoose.model('Client', clientSchema);
