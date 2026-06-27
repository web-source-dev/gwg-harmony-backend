const emailService = require('./emailService');
const smsService = require('./smsService');

async function notifyNewApplication(application) {
  const app = application.toObject ? application.toObject() : application;

  const tasks = [
    emailService.sendStudentConfirmation(app).catch((err) => {
      console.error('Student confirmation email failed:', err.message);
    }),
    emailService.sendAdminNotification(app).catch((err) => {
      console.error('Admin notification email failed:', err.message);
    }),
    smsService.sendAdminNewApplicationSMS(app).catch((err) => {
      console.error('Admin notification SMS failed:', err.message);
    }),
  ];

  await Promise.allSettled(tasks);
}

module.exports = { notifyNewApplication };
