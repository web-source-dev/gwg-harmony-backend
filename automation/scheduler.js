const cron = require('node-cron');
const { runCohortSync } = require('../services/cohortAutomation');

function startCohortScheduler() {
  if (process.env.ENABLE_COHORT_CRON !== 'true') {
    console.log('Cohort cron disabled (set ENABLE_COHORT_CRON=true to enable)');
    return null;
  }

  const schedule = process.env.COHORT_CRON_SCHEDULE || '0 12 * * 5';
  const timezone = process.env.COHORT_CRON_TIMEZONE || 'America/New_York';

  const task = cron.schedule(
    schedule,
    async () => {
      console.log(`[cohort-cron] Starting scheduled sync (${schedule}, ${timezone})`);
      try {
        const result = await runCohortSync({ source: 'coursera_api', type: 'scheduled', sendReminders: true });
        console.log('[cohort-cron] Done:', result);
      } catch (err) {
        console.error('[cohort-cron] Failed:', err.message);
      }
    },
    { timezone }
  );

  console.log(`Cohort cron scheduled: ${schedule} (${timezone})`);
  return task;
}

module.exports = { startCohortScheduler };
