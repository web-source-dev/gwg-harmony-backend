const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    studentName: { type: String, required: true, trim: true },
    grade: { type: String, required: true, enum: ['11th Grade', '12th Grade'] },
    school: { type: String, required: true, trim: true },
    borough: {
      type: String,
      required: true,
      enum: ['Bronx', 'Brooklyn', 'Manhattan', 'Queens', 'Staten Island', 'Other'],
    },
    zipCode: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    cellNumber: { type: String, required: true, trim: true },
    parentGuardianContact: { type: String, trim: true, default: '' },
    referredBy: { type: String, trim: true, default: '' },
    areaOfInterest: { type: String, required: true },
    whyParticipate: { type: String, required: true, trim: true },
    weeklyAvailability: { type: String, required: true },
    understands45Days: { type: Boolean, required: true },
    status: {
      type: String,
      default: 'pending',
      enum: ['pending', 'reviewed', 'selected', 'waitlisted', 'declined'],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Application', applicationSchema);
