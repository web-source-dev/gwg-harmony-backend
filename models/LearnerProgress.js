const mongoose = require('mongoose');

const learnerProgressSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    studentName: { type: String, trim: true, default: '' },
    courseName: { type: String, trim: true, default: '' },
    courses: [{ type: String }],
    progressPercent: { type: Number, default: 0, min: 0, max: 100 },
    lastActivityAt: { type: Date },
    completionStatus: { type: String, trim: true, default: '' },
    daysSinceActivity: { type: Number, default: null },
    status: {
      type: String,
      enum: ['on_track', 'needs_followup', 'completed'],
      default: 'on_track',
    },
    followUpReason: { type: String, trim: true, default: '' },
    lastReminderAt: { type: Date },
    lastSyncedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

learnerProgressSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('LearnerProgress', learnerProgressSchema);
