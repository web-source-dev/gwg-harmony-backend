const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const SHEET_HEADERS = [
  'Last Updated',
  'Student Name',
  'Email',
  'Course(s)',
  'Progress %',
  'Last Activity',
  'Days Inactive',
  'Status',
  'Follow-up Reason',
  'Last Reminder Sent',
];

class GoogleSheetsService {
  isConfigured() {
    return Boolean(
      process.env.GOOGLE_SHEET_ID &&
      (process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS)
    );
  }

  getCredentials() {
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    }

    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!credPath) throw new Error('Google credentials not configured');
    const abs = path.isAbsolute(credPath) ? credPath : path.join(process.cwd(), credPath);
    return JSON.parse(fs.readFileSync(abs, 'utf8'));
  }

  async getSheetsClient() {
    const auth = new google.auth.GoogleAuth({
      credentials: this.getCredentials(),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return google.sheets({ version: 'v4', auth });
  }

  getSheetName() {
    return process.env.GOOGLE_SHEET_TAB || 'Learner Progress';
  }

  async ensureHeaders(sheets) {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const range = `${this.getSheetName()}!A1:J1`;

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: { values: [SHEET_HEADERS] },
    });
  }

  formatLearnerRow(learner) {
    return [
      new Date().toISOString(),
      learner.studentName || '',
      learner.email || '',
      (learner.courses && learner.courses.length ? learner.courses.join('; ') : learner.courseName) || '',
      learner.progressPercent ?? 0,
      learner.lastActivityAt ? learner.lastActivityAt.toISOString().slice(0, 10) : '',
      learner.daysSinceActivity ?? '',
      learner.status === 'needs_followup' ? 'Needs Follow-up' : learner.status === 'completed' ? 'Completed' : 'On Track',
      learner.followUpReason || '',
      learner.lastReminderAt ? learner.lastReminderAt.toISOString().slice(0, 10) : '',
    ];
  }

  async updateLearnerProgress(learners) {
    if (!this.isConfigured()) {
      console.warn('Google Sheets skipped: not configured');
      return { updated: false, reason: 'not_configured' };
    }

    const sheets = await this.getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const sheetName = this.getSheetName();

    await this.ensureHeaders(sheets);

    const rows = learners.map((l) => this.formatLearnerRow(l));
    const range = `${sheetName}!A2:J${rows.length + 1}`;

    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${sheetName}!A2:J1000`,
    });

    if (rows.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows },
      });
    }

    console.log(`Google Sheet updated with ${rows.length} learner rows`);
    return { updated: true, rowCount: rows.length };
  }
}

module.exports = new GoogleSheetsService();
