const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const taskManagerUserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    select: false, // Don't return password by default
  },
  googleId: {
    type: String,
    sparse: true, // Allows multiple null values
  },
  avatar: {
    type: String,
  },
  provider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local',
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  isFirstLogin: {
    type: Boolean,
    default: false,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TaskManagerUser',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
});

// Hash password before saving (only for local provider)
taskManagerUserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
taskManagerUserSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update updatedAt before saving
taskManagerUserSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('TaskManagerUser', taskManagerUserSchema);

