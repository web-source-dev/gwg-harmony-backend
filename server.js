const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { startCohortScheduler } = require('./automation/scheduler');
require('dotenv').config();

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3108',
  credentials: true,
}));
app.use(express.json());

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gwg-pilot')
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.use('/api/applications', require('./routes/applications'));
app.use('/api/cohort', require('./routes/cohort'));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

const PORT = process.env.PORT || 4108;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  startCohortScheduler();
});
