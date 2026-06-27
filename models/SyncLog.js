const mongoose = require('mongoose');

const syncLogSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['scheduled', 'manual', 'csv_import'], default: 'manual' },
    source: { type: String, enum: ['coursera_api', 'csv'], default: 'coursera_api' },
    learnersProcessed: { type: Number, default: 0 },
    sheetUpdated: { type: Boolean, default: false },
    remindersSent: { type: Number, default: 0 },
    success: { type: Boolean, default: true },
    message: { type: String, default: '' },
    error: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SyncLog', syncLogSchema);
