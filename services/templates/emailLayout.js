function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Shared mobile-safe styles (Gmail, Apple Mail, Outlook.com). */
const EMAIL_STYLES = `
  body, table, td, p, a, li { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }
  img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; display: block; max-width: 100%; }
  body { margin: 0 !important; padding: 0 !important; width: 100% !important; min-width: 100% !important; }
  .email-container { width: 100% !important; max-width: 600px !important; }
  .fluid { width: 100% !important; max-width: 100% !important; }
  @media only screen and (max-width: 620px) {
    .email-wrapper { padding: 8px !important; }
    .email-header { padding: 18px 14px !important; }
    .email-body { padding: 18px 14px !important; }
    .email-footer { padding: 14px !important; }
    .email-heading { font-size: 20px !important; line-height: 1.3 !important; }
    .email-title { font-size: 17px !important; }
    .detail-label { font-size: 11px !important; }
    .detail-value { font-size: 15px !important; }
    .summary-box td { padding: 14px !important; }
  }
`;

function baseLayout(title, bodyHtml) {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <title>${escapeHtml(title)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">${EMAIL_STYLES}</style>
</head>
<body style="margin:0;padding:0;width:100%;min-width:100%;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
    ${escapeHtml(title)}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="fluid" style="width:100%;background-color:#f3f4f6;">
    <tr>
      <td align="center" class="email-wrapper" style="padding:16px 8px;">
        <!--[if mso]>
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0"><tr><td>
        <![endif]-->
        <table role="presentation" class="email-container" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #e5e7eb;">
          <tr>
            <td class="email-header" style="background-color:#000000;padding:20px 16px;text-align:center;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:bold;line-height:1.3;color:#ffffff;">Harmony 4 All</p>
              <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.4;color:#d1d5db;">Grow with Google Creative Youth Pilot</p>
            </td>
          </tr>
          <tr>
            <td class="email-body" style="padding:20px 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#374151;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td class="email-footer" style="padding:14px 16px;background-color:#f9fafb;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#6b7280;">
              © ${year} Harmony 4 All · Making Music Accessible
            </td>
          </tr>
        </table>
        <!--[if mso]>
        </td></tr></table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Stacked label/value rows — works on all mobile clients (no 2-column table). */
function detailRows(rows) {
  const items = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:12px 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;line-height:1.4;color:#6b7280;text-transform:uppercase;letter-spacing:0.02em;" class="detail-label">${escapeHtml(label)}</td>
        </tr>
        <tr>
          <td style="padding:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#111827;word-break:break-word;overflow-wrap:anywhere;" class="detail-value">${escapeHtml(value)}</td>
        </tr>
        <tr>
          <td style="padding:0;border-bottom:1px solid #e5e7eb;font-size:0;line-height:0;">&nbsp;</td>
        </tr>`
    )
    .join('');

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="fluid" style="width:100%;margin:0 0 8px;">
      ${items}
    </table>`;
}

function summaryBox(title, lines) {
  const items = lines
    .map(
      (line) =>
        `<p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#374151;word-break:break-word;overflow-wrap:anywhere;">${line}</p>`
    )
    .join('');
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="summary-box fluid" style="width:100%;margin:20px 0;background-color:#f3f4f6;">
      <tr>
        <td style="padding:16px;">
          <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;line-height:1.4;color:#111827;">${escapeHtml(title)}</p>
          ${items}
        </td>
      </tr>
    </table>`;
}

module.exports = {
  escapeHtml,
  baseLayout,
  detailRows,
  summaryBox,
};
