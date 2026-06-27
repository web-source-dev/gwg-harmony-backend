const LearnerProgress = require('../models/LearnerProgress');
const SyncLog = require('../models/SyncLog');
const courseraService = require('./courseraService');
const googleSheetsService = require('./googleSheetsService');
const emailService = require('./emailService');
const { parseCourseraCsv } = require('./csvImportService');

function daysBetween(from, to) {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function getCohortStartDate() {
  const raw = process.env.COHORT_START_DATE;
  if (raw) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

function evaluateLearner(learner, now = new Date()) {
  const inactiveThreshold = parseInt(process.env.INACTIVITY_DAYS_THRESHOLD || '7', 10);
  const reminderCooldownDays = parseInt(process.env.REMINDER_COOLDOWN_DAYS || '7', 10);
  const cohortStart = getCohortStartDate();

  let daysSinceActivity = null;
  if (learner.lastActivityAt) {
    daysSinceActivity = daysBetween(learner.lastActivityAt, now);
  }

  const completion = (learner.completionStatus || '').toLowerCase();
  if (completion.includes('complete')) {
    return {
      ...learner,
      daysSinceActivity,
      status: 'completed',
      followUpReason: '',
      shouldRemind: false,
    };
  }

  let behind = false;
  let reason = '';

  if (daysSinceActivity === null) {
    behind = true;
    reason = 'No activity date on record';
  } else if (daysSinceActivity >= inactiveThreshold) {
    behind = true;
    reason = `No Coursera activity in ${daysSinceActivity} days`;
  } else if (cohortStart) {
    const cohortDay = daysBetween(cohortStart, now) + 1;
    const expectedMin = Math.min(95, Math.round((cohortDay / 45) * 100 * 0.45));
    if (cohortDay > 10 && learner.progressPercent < expectedMin) {
      behind = true;
      reason = `Progress ${learner.progressPercent}% is below expected ~${expectedMin}% for day ${cohortDay}`;
    }
  } else if (learner.progressPercent === 0 && daysSinceActivity >= 3) {
    behind = true;
    reason = 'No progress recorded yet';
  }

  let shouldRemind = behind;
  if (behind && learner.lastReminderAt) {
    const daysSinceReminder = daysBetween(learner.lastReminderAt, now);
    if (daysSinceReminder < reminderCooldownDays) shouldRemind = false;
  }

  return {
    ...learner,
    daysSinceActivity,
    status: behind ? 'needs_followup' : 'on_track',
    followUpReason: behind ? reason : '',
    shouldRemind,
  };
}

async function upsertLearners(rawLearners) {
  const now = new Date();
  const saved = [];

  for (const raw of rawLearners) {
    const existing = await LearnerProgress.findOne({ email: raw.email });
    const learner = evaluateLearner(
      { ...raw, lastReminderAt: existing?.lastReminderAt || null },
      now
    );

    await LearnerProgress.findOneAndUpdate(
      { email: learner.email },
      {
        email: learner.email,
        studentName: learner.studentName,
        courseName: learner.courseName,
        courses: learner.courses || [],
        progressPercent: learner.progressPercent,
        lastActivityAt: learner.lastActivityAt,
        completionStatus: learner.completionStatus,
        daysSinceActivity: learner.daysSinceActivity,
        status: learner.status,
        followUpReason: learner.followUpReason,
        lastSyncedAt: now,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    saved.push(learner);
  }

  return saved;
}

async function sendReminders(learners) {
  let sent = 0;
  const now = new Date();

  for (const learner of learners) {
    if (!learner.shouldRemind) continue;

    try {
      await emailService.sendProgressReminder(learner);
      await LearnerProgress.updateOne(
        { email: learner.email },
        { lastReminderAt: now, followUpReason: learner.followUpReason }
      );
      learner.lastReminderAt = now;
      sent += 1;
    } catch (err) {
      console.error(`Reminder failed for ${learner.email}:`, err.message);
    }
  }

  return sent;
}

async function runCohortSync({ source = 'coursera_api', type = 'manual', csvText = null, sendReminders = true } = {}) {
  const log = new SyncLog({ type, source });

  try {
    let rawLearners = [];

    if (source === 'csv') {
      if (!csvText) throw new Error('CSV content is required');
      rawLearners = parseCourseraCsv(csvText);
    } else {
      rawLearners = await courseraService.fetchEnrollmentReports();
    }

    const learners = await upsertLearners(rawLearners);
    const sheetResult = await googleSheetsService.updateLearnerProgress(learners);

    let remindersSent = 0;
    if (sendReminders) {
      remindersSent = await sendReminders(learners);
    }

    if (remindersSent > 0) {
      const refreshed = await LearnerProgress.find().lean();
      await googleSheetsService.updateLearnerProgress(refreshed);
    }

    log.learnersProcessed = learners.length;
    log.sheetUpdated = sheetResult.updated === true;
    log.remindersSent = remindersSent;
    log.success = true;
    log.message = `Synced ${learners.length} learners; ${remindersSent} reminders sent`;
    await log.save();

    return {
      success: true,
      learnersProcessed: learners.length,
      sheetUpdated: sheetResult.updated,
      remindersSent,
      learners,
    };
  } catch (err) {
    log.success = false;
    log.error = err.message;
    log.message = 'Sync failed';
    await log.save();
    throw err;
  }
}

module.exports = {
  runCohortSync,
  evaluateLearner,
  upsertLearners,
  sendReminders,
};
