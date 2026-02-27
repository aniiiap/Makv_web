const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskManagerTask',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskManagerUser',
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'created',
        'updated',
        'deleted',
        'status_changed',
        'assigned',
        'unassigned',
        'priority_changed',
        'due_date_changed',
        'comment_added',
        'subtask_added',
        'subtask_completed',
        'subtask_deleted',
        'time_logged',
        'timer_started',
        'timer_stopped',
      ],
    },
    field: String, // Which field was changed (status, priority, assignedTo, etc.)
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    description: String, // Human-readable description of the change
  },
  {
    timestamps: true,
  }
);

// Index for querying task activities
activityLogSchema.index({ task: 1, createdAt: -1 });
activityLogSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('TaskManagerActivityLog', activityLogSchema);

