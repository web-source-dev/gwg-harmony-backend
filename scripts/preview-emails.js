/**
 * Writes HTML previews to backend/email-previews/ — open on your phone or in a narrow browser window.
 * Usage: node scripts/preview-emails.js
 */
const fs = require('fs');
const path = require('path');
const {
  studentConfirmationHtml,
  adminNotificationHtml,
} = require('../services/templates/gwgEmails');
const { progressReminderHtml } = require('../services/templates/gwgReminderEmail');

const outDir = path.join(__dirname, '..', 'email-previews');
fs.mkdirSync(outDir, { recursive: true });

const sampleApp = {
  studentName: 'Jane Doe',
  grade: '11th Grade',
  school: 'Fiorello H. LaGuardia High School of Music & Art',
  borough: 'Manhattan',
  zipCode: '10023',
  email: 'jane.doe.student@example-school.org',
  cellNumber: '+1 (917) 555-0142',
  parentGuardianContact: 'Maria Doe · maria.doe@example.com · +1 (917) 555-0199',
  referredBy: 'School counselor',
  areaOfInterest: 'Digital Marketing & Social Media',
  whyParticipate:
    'I want to build real skills in digital marketing while exploring how creativity and technology connect. This pilot would help me prepare for college and a career in the arts and media space.',
  weeklyAvailability: '10–15 hours per week',
  understands45Days: true,
  createdAt: new Date().toISOString(),
};

const files = {
  'student-confirmation.html': studentConfirmationHtml(sampleApp),
  'admin-notification.html': adminNotificationHtml(sampleApp),
  'progress-reminder.html': progressReminderHtml({
    studentName: 'Jane Doe',
    courseName: 'Google Digital Marketing & E-commerce Certificate',
    progressPercent: 42,
  }),
};

for (const [name, html] of Object.entries(files)) {
  fs.writeFileSync(path.join(outDir, name), html, 'utf8');
  console.log('Wrote', name);
}

console.log('\nOpen files in', outDir);
