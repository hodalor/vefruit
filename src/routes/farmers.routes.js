const express = require('express');

const User = require('../models/User');
const { hashPassword } = require('../utils/hash');
const { serializeUser } = require('../utils/serializers');
const { publishRealtimeEvent } = require('../utils/realtime');

const router = express.Router();

router.get('/', async (req, res) => {
  const status = req.query.status;
  const query = { role: 'farmer' };
  if (status) query.status = status;
  const farmers = await User.find(query).sort({ createdAt: -1 });
  res.json({ success: true, farmers: farmers.map(serializeUser) });
});

router.patch('/:id/status', async (req, res) => {
  const status = String(req.body.status || '').trim();
  const approved = status === 'approved';
  const farmer = await User.findOneAndUpdate(
    { _id: req.params.id, role: 'farmer' },
    { status, approved },
    { new: true }
  );
  if (!farmer) return res.status(404).json({ success: false, message: 'Farmer not found' });
  const serialized = serializeUser(farmer);
  publishRealtimeEvent('farmer.changed', { farmerId: serialized.id, action: 'updated' });
  res.json({ success: true, farmer: serialized });
});

router.patch('/:id/reset-password', async (req, res) => {
  const password = String(req.body.password || '').trim();
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
  }

  const farmer = await User.findOneAndUpdate(
    { _id: req.params.id, role: 'farmer' },
    { password: hashPassword(password) },
    { new: true }
  );

  if (!farmer) {
    return res.status(404).json({ success: false, message: 'Farmer not found' });
  }

  const serialized = serializeUser(farmer);
  publishRealtimeEvent('farmer.changed', { farmerId: serialized.id, action: 'password-reset' });
  res.json({ success: true, farmer: serialized });
});

router.delete('/:id', async (req, res) => {
  await User.findOneAndDelete({ _id: req.params.id, role: 'farmer' });
  publishRealtimeEvent('farmer.changed', { farmerId: req.params.id, action: 'deleted' });
  res.json({ success: true });
});

module.exports = router;
