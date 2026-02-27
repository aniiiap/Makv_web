const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskManagerUser',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'task_assigned',
        'task_updated',
        'task_status_changed',
        'task_commented',
        'team_invite',
        'team_joined',
        'task_due_soon',
        'task_overdue',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    relatedTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskManagerTask',
    },
    relatedTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskManagerTeam',
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    emailSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for unread notifications
notificationSchema.index({ user: 1, read: 1 });

module.exports = mongoose.model('TaskManagerNotification', notificationSchema);

