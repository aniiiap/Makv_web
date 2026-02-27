const mongoose = require('mongoose');

const pendingInvitationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskManagerTeam',
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member'],
      default: 'member',
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskManagerUser',
      required: true,
    },
    inviteToken: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    accepted: {
      type: Boolean,
      default: false,
    },
    acceptedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster lookups
pendingInvitationSchema.index({ email: 1, team: 1 });
pendingInvitationSchema.index({ inviteToken: 1 });
pendingInvitationSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('TaskManagerPendingInvitation', pendingInvitationSchema);

