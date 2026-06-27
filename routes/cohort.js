const express = require('express');
const router = express.Router();
const requireAdmin = require('../middleware/requireAdmin');
const { runCohortSync } = require('../services/cohortAutomation');
const LearnerProgress = require('../models/LearnerProgress');
const SyncLog = require('../models/SyncLog');
const courseraService = require('../services/courseraService');
const googleSheetsService = require('../services/googleSheetsService');

// GET /api/cohort/status — config + latest sync
router.get('/status', requireAdmin, async (_req, res) => {
  try {
    const latest = await SyncLog.findOne().sort({ createdAt: -1 });
    const learnerCount = await LearnerProgress.countDocuments();
    const courseraAccess = courseraService.isConfigured()
      ? await courseraService.testApiAccess()
      : { ok: false, reason: 'not_configured' };

    res.json({
      success: true,
      courseraConfigured: courseraService.isConfigured(),
      courseraHasRefreshToken: courseraService.hasRefreshToken(),
      courseraApiAccess: courseraAccess,
      sheetsConfigured: googleSheetsService.isConfigured(),
      learnerCount,
      latestSync: latest,
      cronEnabled: process.env.ENABLE_COHORT_CRON === 'true',
      cronSchedule: process.env.COHORT_CRON_SCHEDULE || '0 12 * * 5',
      timezone: process.env.COHORT_CRON_TIMEZONE || 'America/New_York',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/cohort/progress — all learner records
router.get('/progress', requireAdmin, async (_req, res) => {
  try {
    const learners = await LearnerProgress.find().sort({ status: -1, progressPercent: 1 });
    res.json({ success: true, learners });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/cohort/sync-logs
router.get('/sync-logs', requireAdmin, async (_req, res) => {
  try {
    const logs = await SyncLog.find().sort({ createdAt: -1 }).limit(20);
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/cohort/sync — pull Coursera + update sheet + optional reminders
router.post('/sync', requireAdmin, async (req, res) => {
  try {
    const sendReminders = req.body?.sendReminders !== false;
    const result = await runCohortSync({ source: 'coursera_api', type: 'manual', sendReminders });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Cohort sync error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/cohort/import-csv — fallback when Coursera API not ready
router.post('/import-csv', requireAdmin, async (req, res) => {
  try {
    const csvText = req.body?.csv;
    if (!csvText || typeof csvText !== 'string') {
      return res.status(400).json({ success: false, message: 'Request body must include "csv" text' });
    }
    const sendReminders = req.body?.sendReminders !== false;
    const result = await runCohortSync({ source: 'csv', type: 'csv_import', csvText, sendReminders });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('CSV import error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
