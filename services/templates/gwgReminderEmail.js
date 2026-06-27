const { escapeHtml, baseLayout } = require('./emailLayout');

function firstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || 'there';
}

function progressReminderHtml(learner) {
  const name = firstName(learner.studentName);
  const course = learner.courseName || (learner.courses && learner.courses[0]) || 'your Google Career Certificate';

  return baseLayout(
    'Coursera check-in',
    `
    <h2 class="email-heading" style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:bold;line-height:1.3;color:#111827;">Hi ${escapeHtml(name)}, a gentle check-in</h2>
    <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#374151;">We noticed you may have fallen a little behind on <strong style="color:#111827;">${escapeHtml(course)}</strong> this week.</p>
    <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#374151;">Your current progress: <strong style="color:#111827;">${learner.progressPercent ?? 0}%</strong>.</p>
    <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#374151;">This 45-day pilot moves quickly — even 30–60 minutes this week can keep you on track for your Google Career Certificate.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="summary-box fluid" style="width:100%;margin:0 0 16px;background-color:#f3f4f6;">
      <tr>
        <td style="padding:16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#374151;">
          <strong style="color:#111827;">Tip:</strong> Log in to Coursera, complete one module, and reply to this email if you need help from the Harmony 4 All team.
        </td>
      </tr>
    </table>
    <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#374151;">We believe in you — you've got this!</p>
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#374151;">With support,<br><strong style="color:#111827;">Harmony 4 All Team</strong></p>
    `
  );
}

function progressReminderText(learner) {
  const name = firstName(learner.studentName);
  const course = learner.courseName || (learner.courses && learner.courses[0]) || 'your Google Career Certificate';
  return `Hi ${name},

We noticed you may have fallen a little behind on ${course} this week.

Your current progress: ${learner.progressPercent ?? 0}%.

This 45-day pilot moves quickly — even 30–60 minutes this week can keep you on track for your Google Career Certificate.

Log in to Coursera and complete one module. Reply if you need help from Harmony 4 All.

We believe in you!

Harmony 4 All Team`;
}

module.exports = { progressReminderHtml, progressReminderText };
