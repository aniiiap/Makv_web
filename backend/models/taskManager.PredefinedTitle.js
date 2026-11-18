const mongoose = require('mongoose');

const taskPredefinedTitleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a title'],
      trim: true,
      unique: true,
    },
    subtitles: [
      {
        type: mongoose.Schema.Types.Mixed,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskManagerUser',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('TaskPredefinedTitle', taskPredefinedTitleSchema);
