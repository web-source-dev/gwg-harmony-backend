const twilio = require('twilio');

class SMSService {
  constructor() {
    this.client = null;
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    }
  }

  isConfigured() {
    return Boolean(
      this.client &&
      process.env.TWILIO_MESSAGING_SERVICE_SID &&
      process.env.ADMIN_PHONE_NUMBER
    );
  }

  async sendSMS(to, message) {
    if (!this.client) throw new Error('Twilio is not configured');
    const result = await this.client.messages.create({
      body: message,
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
      to,
    });
    console.log(`SMS sent to ${to}:`, result.sid);
    return result;
  }

  async sendAdminNewApplicationSMS(app) {
    if (!this.isConfigured()) {
      console.warn('Admin SMS skipped: Twilio is not configured');
      return null;
    }

    const adminPhone = process.env.ADMIN_PHONE_NUMBER;
    const message = `New GwG Pilot application from ${app.studentName} (${app.grade}, ${app.borough}). Track: ${app.areaOfInterest}. Email: ${app.email}. Check admin dashboard for details.`;

    return this.sendSMS(adminPhone, message);
  }
}

module.exports = new SMSService();
