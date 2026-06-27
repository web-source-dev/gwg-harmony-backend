#!/usr/bin/env node
require('dotenv').config();
const mongoose = require('mongoose');
const { runCohortSync } = require('../services/cohortAutomation');

async function main() {
  const source = process.argv.includes('--csv') ? 'csv' : 'coursera_api';
  const skipReminders = process.argv.includes('--no-reminders');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gwg-pilot');

  let csvText = null;
  if (source === 'csv') {
    const fs = require('fs');
    const fileArg = process.argv.find((a) => a.endsWith('.csv'));
    if (!fileArg) {
      console.error('Usage: node scripts/run-cohort-sync.js --csv path/to/export.csv');
      process.exit(1);
    }
    csvText = fs.readFileSync(fileArg, 'utf8');
  }

  const result = await runCohortSync({
    source,
    type: 'manual',
    csvText,
    sendReminders: !skipReminders,
  });

  console.log(JSON.stringify(result, null, 2));
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
