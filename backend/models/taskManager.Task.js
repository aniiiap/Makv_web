const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a task title'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskManagerTeam',
      // Team is optional - allows personal tasks
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskManagerUser',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskManagerUser',
      required: true,
    },
    status: {
      type: String,
      enum: ['todo', 'in-progress', 'in-review', 'done'],
      default: 'todo',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    isBillable: {
      type: Boolean,
      default: false,
    },
    dueDate: {
      type: Date,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    attachments: [
      {
        url: String,
        name: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    comments: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'TaskManagerUser',
        },
        text: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    subtasks: [
      {
        title: {
          type: String,
          required: true,
          trim: true,
        },
        completed: {
          type: Boolean,
          default: false,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    timeSpent: {
      type: Number, // Total time in seconds
      default: 0,
    },
    timeEntries: [
      {
        startTime: {
          type: Date,
          required: true,
        },
        endTime: Date,
        duration: {
          type: Number, // Duration in seconds
          default: 0,
        },
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'TaskManagerUser',
          required: true,
        },
        description: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    activeTimer: {
      startTime: Date,
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TaskManagerUser',
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
taskSchema.index({ team: 1, status: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ dueDate: 1 });

module.exports = mongoose.model('TaskManagerTask', taskSchema);

