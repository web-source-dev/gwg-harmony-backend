const Brevo = require('@getbrevo/brevo');
const {
  studentConfirmationHtml,
  studentConfirmationText,
  adminNotificationHtml,
  adminNotificationText,
  firstName,
} = require('./templates/gwgEmails');

class EmailService {
  constructor() {
    this.api = new Brevo.TransactionalEmailsApi();
    if (process.env.BREVO_API_KEY) {
      this.api.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);
    }
  }

  isConfigured() {
    return Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL);
  }

  getSender() {
    const email = process.env.BREVO_SENDER_EMAIL;
    if (!email) throw new Error('BREVO_SENDER_EMAIL is not set');
    return { name: 'Harmony 4 All', email };
  }

  getAdminEmail() {
    return process.env.ADMIN_EMAIL || process.env.BREVO_SENDER_EMAIL;
  }

  async sendTransactional({ to, toName, subject, html, text }) {
    const sendSmtpEmail = new Brevo.SendSmtpEmail();
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = html;
    sendSmtpEmail.textContent = text;
    sendSmtpEmail.sender = this.getSender();
    sendSmtpEmail.to = [{ email: to, name: toName || to }];
    return this.api.sendTransacEmail(sendSmtpEmail);
  }

  async sendStudentConfirmation(app) {
    if (!this.isConfigured()) {
      console.warn('Email skipped: Brevo is not configured');
      return null;
    }

    const name = firstName(app.studentName);
    const result = await this.sendTransactional({
      to: app.email,
      toName: app.studentName,
      subject: `Application received — Grow with Google Creative Youth Pilot`,
      html: studentConfirmationHtml(app),
      text: studentConfirmationText(app),
    });
    console.log(`Student confirmation email sent to ${app.email}:`, result.body?.messageId || 'ok');
    return result;
  }

  async sendAdminNotification(app) {
    if (!this.isConfigured()) {
      console.warn('Admin email skipped: Brevo is not configured');
      return null;
    }

    const adminEmail = this.getAdminEmail();
    if (!adminEmail) {
      console.warn('Admin email skipped: ADMIN_EMAIL is not set');
      return null;
    }

    const result = await this.sendTransactional({
      to: adminEmail,
      toName: 'Harmony 4 All Admin',
      subject: `New GwG Pilot Application — ${app.studentName}`,
      html: adminNotificationHtml(app),
      text: adminNotificationText(app),
    });
    console.log(`Admin notification email sent to ${adminEmail}:`, result.body?.messageId || 'ok');
    return result;
  }

  async sendProgressReminder(learner) {
    if (!this.isConfigured()) {
      console.warn('Progress reminder skipped: Brevo is not configured');
      return null;
    }

    const { progressReminderHtml, progressReminderText } = require('./templates/gwgReminderEmail');
    const result = await this.sendTransactional({
      to: learner.email,
      toName: learner.studentName || learner.email,
      subject: 'Friendly check-in — keep your Coursera momentum going',
      html: progressReminderHtml(learner),
      text: progressReminderText(learner),
    });
    console.log(`Progress reminder sent to ${learner.email}`);
    return result;
  }
}

module.exports = new EmailService();
