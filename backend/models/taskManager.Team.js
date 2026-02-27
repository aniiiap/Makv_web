const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TaskManagerUser',
    required: true,
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'member'],
    default: 'member',
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
});

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a team name'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskManagerUser',
      required: true,
    },
    members: [teamMemberSchema],
    inviteToken: {
      type: String,
    },
    inviteTokenExpire: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add owner to members when team is created
teamSchema.pre('save', function (next) {
  if (this.isNew && !this.members.find((m) => m.user.toString() === this.owner.toString())) {
    this.members.push({
      user: this.owner,
      role: 'owner',
    });
  }
  next();
});

module.exports = mongoose.model('TaskManagerTeam', teamSchema);

