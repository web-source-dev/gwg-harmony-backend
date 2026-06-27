const { escapeHtml, baseLayout, detailRows, summaryBox } = require('./emailLayout');

function firstName(studentName) {
  return String(studentName || '').trim().split(/\s+/)[0] || 'there';
}

function studentConfirmationHtml(app) {
  const name = firstName(app.studentName);
  return baseLayout(
    'Application Received',
    `
    <h2 class="email-heading" style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:bold;line-height:1.3;color:#111827;">Thank you, ${escapeHtml(name)}!</h2>
    <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#374151;">We received your interest form for the <strong style="color:#111827;">Grow with Google Creative Youth Pilot</strong>.</p>
    <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#374151;">Our team will review your application carefully. Selected students will be contacted by email or phone within 1–2 weeks.</p>
    ${summaryBox('Your submission summary', [
      `<strong style="color:#111827;">Track:</strong> ${escapeHtml(app.areaOfInterest)}`,
      `<strong style="color:#111827;">School:</strong> ${escapeHtml(app.school)}`,
      `<strong style="color:#111827;">Borough:</strong> ${escapeHtml(app.borough)}`,
    ])}
    <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#6b7280;">This pilot has only 5 seats. Even if you are not selected this round, you may be considered for future cohorts.</p>
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#374151;">With gratitude,<br><strong style="color:#111827;">Harmony 4 All Team</strong></p>
    `
  );
}

function studentConfirmationText(app) {
  const name = firstName(app.studentName);
  return `Hi ${name},

Thank you for submitting your interest form for the Grow with Google Creative Youth Pilot.

We received your application and our team will review it carefully. Selected students will be contacted within 1–2 weeks.

Track: ${app.areaOfInterest}
School: ${app.school}
Borough: ${app.borough}

Harmony 4 All`;
}

function adminNotificationHtml(app) {
  const rows = [
    ['Student', app.studentName],
    ['Grade', app.grade],
    ['School', app.school],
    ['Borough', app.borough],
    ['ZIP', app.zipCode],
    ['Email', app.email],
    ['Phone', app.cellNumber],
    ['Parent / Guardian', app.parentGuardianContact || '—'],
    ['Referred By', app.referredBy || '—'],
    ['Area of Interest', app.areaOfInterest],
    ['Weekly Availability', app.weeklyAvailability],
    ['45-Day Commitment', app.understands45Days ? 'Yes' : 'No'],
    ['Submitted', app.createdAt ? new Date(app.createdAt).toLocaleString() : new Date().toLocaleString()],
  ];

  return baseLayout(
    'New GwG Pilot Application',
    `
    <h2 class="email-heading" style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:bold;line-height:1.3;color:#111827;">New pilot application</h2>
    <p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#374151;">A student submitted the Grow with Google Creative Youth Pilot interest form.</p>
    ${detailRows(rows)}
    <p class="email-title" style="margin:24px 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:bold;line-height:1.4;color:#111827;">Why they want to participate</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:0 0 8px;">
      <tr>
        <td style="padding:14px;background-color:#f9fafb;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#374151;word-break:break-word;overflow-wrap:anywhere;white-space:pre-wrap;">${escapeHtml(app.whyParticipate)}</td>
      </tr>
    </table>
    `
  );
}

function adminNotificationText(app) {
  return `New Grow with Google Creative Youth Pilot application

Student: ${app.studentName}
Grade: ${app.grade}
School: ${app.school}
Borough: ${app.borough} · ZIP ${app.zipCode}
Email: ${app.email}
Phone: ${app.cellNumber}
Parent/Guardian: ${app.parentGuardianContact || '—'}
Referred By: ${app.referredBy || '—'}
Area of Interest: ${app.areaOfInterest}
Availability: ${app.weeklyAvailability}
45-Day Commitment: ${app.understands45Days ? 'Yes' : 'No'}

Why participate:
${app.whyParticipate}`;
}

module.exports = {
  studentConfirmationHtml,
  studentConfirmationText,
  adminNotificationHtml,
  adminNotificationText,
  firstName,
};
