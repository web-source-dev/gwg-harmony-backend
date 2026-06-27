const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const { notifyNewApplication } = require('../services/notifications');

function requireAdmin(req, res, next) {
  const pw = req.headers['x-admin-password'];
  if (!pw || pw !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
}

// POST /api/applications — public: submit interest form
router.post('/', async (req, res) => {
  try {
    const app = new Application(req.body);
    await app.save();

    notifyNewApplication(app).catch((err) => {
      console.error('Notification dispatch error:', err.message);
    });

    res.status(201).json({ success: true, message: 'Application submitted successfully', id: app._id });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// GET /api/applications — admin: list all submissions
router.get('/', requireAdmin, async (_req, res) => {
  try {
    const apps = await Application.find().sort({ createdAt: -1 });
    res.json({ success: true, applications: apps });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/applications/stats — admin: summary counts
router.get('/stats', requireAdmin, async (_req, res) => {
  try {
    const total = await Application.countDocuments();
    const byStatus = await Application.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    res.json({ success: true, total, byStatus });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/applications/:id/status — admin: update status
router.patch('/:id/status', requireAdmin, async (req, res) => {
  try {
    const updated = await Application.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, application: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
