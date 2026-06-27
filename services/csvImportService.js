function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizeHeader(h) {
  return h.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function findColumn(headers, candidates) {
  const normalized = headers.map(normalizeHeader);
  for (const candidate of candidates) {
    const idx = normalized.findIndex((h) => h.includes(candidate));
    if (idx >= 0) return idx;
  }
  return -1;
}

function parseProgress(value) {
  if (value == null || value === '') return 0;
  const cleaned = String(value).replace('%', '').trim();
  const num = parseFloat(cleaned);
  if (Number.isNaN(num)) return 0;
  return num <= 1 ? Math.round(num * 100) : Math.round(num);
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseCourseraCsv(csvText) {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const emailIdx = findColumn(headers, ['email', 'learner email', 'user email']);
  const nameIdx = findColumn(headers, ['name', 'learner name', 'full name', 'student']);
  const courseIdx = findColumn(headers, ['course', 'content', 'program', 'specialization']);
  const progressIdx = findColumn(headers, ['progress', 'overall progress', 'completion', 'percent complete']);
  const activityIdx = findColumn(headers, ['last activity', 'last accessed', 'last login', 'activity date']);
  const statusIdx = findColumn(headers, ['status', 'completion status', 'state']);

  if (emailIdx < 0) {
    throw new Error('CSV must include an Email column');
  }

  const records = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    const email = (cols[emailIdx] || '').toLowerCase().trim();
    if (!email) continue;

    records.push({
      email,
      studentName: nameIdx >= 0 ? cols[nameIdx] || '' : '',
      courseName: courseIdx >= 0 ? cols[courseIdx] || '' : '',
      progressPercent: progressIdx >= 0 ? parseProgress(cols[progressIdx]) : 0,
      lastActivityAt: activityIdx >= 0 ? parseDate(cols[activityIdx]) : null,
      completionStatus: statusIdx >= 0 ? cols[statusIdx] || '' : '',
    });
  }

  const courseraService = require('./courseraService');
  return courseraService.aggregateByEmail(records);
}

module.exports = { parseCourseraCsv };
