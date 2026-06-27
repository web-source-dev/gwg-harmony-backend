require('dotenv').config();

const API_BASE = (process.env.COURSERA_API_BASE || 'https://api.coursera.org').replace(/\/$/, '');
// OAuth token endpoint is on .com; Enterprise data API is on .org
const DEFAULT_TOKEN_URL = 'https://api.coursera.com/oauth2/client_credentials/token';
const OAUTH_TOKEN_URL = 'https://accounts.coursera.org/oauth2/v1/token';
const DEFAULT_SCOPE = 'access_business_api';

let cachedToken = null;
let tokenExpiresAt = 0;

class CourseraService {
  isConfigured() {
    return Boolean(
      process.env.COURSERA_CLIENT_ID &&
      process.env.COURSERA_CLIENT_SECRET &&
      process.env.COURSERA_ORG_ID
    );
  }

  hasRefreshToken() {
    return Boolean(process.env.COURSERA_REFRESH_TOKEN);
  }

  async requestToken(bodyParams) {
    const tokenUrl = bodyParams.get('grant_type') === 'refresh_token'
      ? (process.env.COURSERA_OAUTH_TOKEN_URL || OAUTH_TOKEN_URL)
      : (process.env.COURSERA_TOKEN_URL || DEFAULT_TOKEN_URL);

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: bodyParams.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Coursera token request failed (${res.status}): ${text}`);
    }

    const data = await res.json();
    if (!data.access_token) throw new Error('Coursera token response missing access_token');

    cachedToken = data.access_token;
    tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
    return cachedToken;
  }

  async getAccessTokenViaRefresh() {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: process.env.COURSERA_REFRESH_TOKEN,
      client_id: process.env.COURSERA_CLIENT_ID,
      client_secret: process.env.COURSERA_CLIENT_SECRET,
    });
    return this.requestToken(body);
  }

  async getAccessTokenViaClientCredentials() {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.COURSERA_CLIENT_ID,
      client_secret: process.env.COURSERA_CLIENT_SECRET,
    });
    body.set('scope', process.env.COURSERA_SCOPE || DEFAULT_SCOPE);
    return this.requestToken(body);
  }

  async getAccessToken() {
    if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
      return cachedToken;
    }

    if (this.hasRefreshToken()) {
      return this.getAccessTokenViaRefresh();
    }

    return this.getAccessTokenViaClientCredentials();
  }

  /** Quick probe — returns whether Enterprise API responds (not just token). */
  async testApiAccess() {
    if (!this.isConfigured()) {
      return { ok: false, reason: 'not_configured' };
    }

    try {
      const orgId = process.env.COURSERA_ORG_ID;
      const token = await this.getAccessToken();
      const url = `${API_BASE}/api/businesses.v1/${orgId}/programs?limit=1`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      if (res.ok) return { ok: true, authMode: this.hasRefreshToken() ? 'refresh_token' : 'client_credentials' };
      if (res.status === 403) {
        return {
          ok: false,
          reason: 'forbidden',
          authMode: this.hasRefreshToken() ? 'refresh_token' : 'client_credentials',
          message:
            'Coursera returned 403 — your app cannot access Enterprise learner data yet. ' +
            'Run `npm run coursera:auth` in the backend folder (admin OAuth), add COURSERA_REFRESH_TOKEN to .env, ' +
            'or ask Coursera to enable For Business API on your contract. Use CSV import until then.',
        };
      }
      const text = await res.text();
      return { ok: false, reason: 'error', status: res.status, message: text.slice(0, 200) };
    } catch (err) {
      return { ok: false, reason: 'error', message: err.message };
    }
  }

  async apiGet(path, token) {
    const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      const hint =
        res.status === 404
          ? ' Check COURSERA_ORG_ID (from Coursera API console, not the /o/slug in the admin URL).'
          : res.status === 403
            ? ' Enterprise API access denied — run `npm run coursera:auth` in backend, add COURSERA_REFRESH_TOKEN to .env, or use CSV import. Contact Coursera if API access is not on your contract.'
            : '';
      throw new Error(`Coursera API request failed (${res.status}): ${text || url}${hint}`);
    }

    return res.json();
  }

  extractElements(payload) {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.elements)) return payload.elements;
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.results)) return payload.results;
    return [];
  }

  getNextPageUrl(payload) {
    if (!payload?.paging?.next) return null;
    return payload.paging.next.startsWith('http')
      ? payload.paging.next
      : `${API_BASE}${payload.paging.next}`;
  }

  normalizeRecord(raw) {
    const email = (
      raw.email ||
      raw.userEmail ||
      raw.learnerEmail ||
      raw.memberEmail ||
      raw.user?.email ||
      raw.learner?.email ||
      ''
    )
      .toString()
      .toLowerCase()
      .trim();

    const studentName =
      raw.fullName ||
      raw.name ||
      raw.learnerName ||
      raw.userName ||
      raw.user?.fullName ||
      [raw.firstName, raw.lastName].filter(Boolean).join(' ') ||
      '';

    const courseName =
      raw.courseName ||
      raw.contentName ||
      raw.programName ||
      raw.course?.name ||
      raw.content?.name ||
      '';

    let progressPercent = raw.overallProgress ?? raw.progress ?? raw.progressPercent ?? raw.completionPercentage;
    if (typeof progressPercent === 'string') progressPercent = parseFloat(progressPercent);
    if (Number.isNaN(progressPercent)) progressPercent = 0;
    if (progressPercent <= 1) progressPercent = Math.round(progressPercent * 100);

    const lastActivityRaw =
      raw.lastActivityAt ||
      raw.lastActivityTime ||
      raw.lastActivity ||
      raw.lastAccessedAt ||
      raw.updatedAt ||
      raw.lastUpdatedAt;

    const completionStatus = raw.completionStatus || raw.state || raw.status || '';

    if (!email) return null;

    return {
      email,
      studentName: studentName.trim(),
      courseName: courseName.trim(),
      progressPercent: Math.max(0, Math.min(100, Math.round(progressPercent))),
      lastActivityAt: lastActivityRaw ? new Date(lastActivityRaw) : null,
      completionStatus: String(completionStatus),
    };
  }

  aggregateByEmail(records) {
    const map = new Map();

    for (const record of records) {
      const existing = map.get(record.email);
      if (!existing) {
        map.set(record.email, {
          ...record,
          courses: record.courseName ? [record.courseName] : [],
        });
        continue;
      }

      if (record.courseName && !existing.courses.includes(record.courseName)) {
        existing.courses.push(record.courseName);
      }
      if (record.progressPercent > existing.progressPercent) {
        existing.progressPercent = record.progressPercent;
        existing.courseName = record.courseName || existing.courseName;
      }
      if (
        record.lastActivityAt &&
        (!existing.lastActivityAt || record.lastActivityAt > existing.lastActivityAt)
      ) {
        existing.lastActivityAt = record.lastActivityAt;
      }
      if (record.studentName && !existing.studentName) {
        existing.studentName = record.studentName;
      }
    }

    return [...map.values()];
  }

  async fetchEnrollmentReports() {
    if (!this.isConfigured()) {
      throw new Error('Coursera API is not configured (COURSERA_CLIENT_ID, COURSERA_CLIENT_SECRET, COURSERA_ORG_ID)');
    }

    const orgId = process.env.COURSERA_ORG_ID;
    const token = await this.getAccessToken();
    const programId = process.env.COURSERA_PROGRAM_ID;

    let path = `/api/businesses.v1/${orgId}/enrollmentReports?limit=100`;
    if (programId) path += `&programId=${encodeURIComponent(programId)}`;

    const allRaw = [];
    let nextUrl = `${API_BASE}${path}`;

    while (nextUrl) {
      const payload = await this.apiGet(nextUrl, token);
      allRaw.push(...this.extractElements(payload));
      nextUrl = this.getNextPageUrl(payload);
    }

    const normalized = allRaw.map((r) => this.normalizeRecord(r)).filter(Boolean);
    return this.aggregateByEmail(normalized);
  }
}

module.exports = new CourseraService();
