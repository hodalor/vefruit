const express = require('express');

const User = require('../models/User');
const { hashPassword } = require('../utils/hash');
const { serializeUser } = require('../utils/serializers');
const { publishRealtimeEvent } = require('../utils/realtime');

const router = express.Router();

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizePhone(value) {
  return String(value || '').replace(/\s+/g, '').trim();
}

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

router.get('/', async (req, res) => {
  const role = req.query.role;
  const query = role ? { role } : { role: { $in: ['buyer', 'admin'] } };
  const users = await User.find(query).sort({ createdAt: -1 });
  res.json({ success: true, users: users.map(serializeUser) });
});

router.post('/', async (req, res) => {
  const { name, username, phone, email, password } = req.body;
  if (!name || !username || !phone || !password) {
    return res.status(400).json({ success: false, message: 'Full name, username, phone number, and password are required' });
  }

  const normalizedUsername = normalizeUsername(username);
  const normalizedPhone = normalizePhone(phone);
  const normalizedEmail = normalizeEmail(email);

  if (await User.findOne({ username: normalizedUsername })) {
    return res.status(400).json({ success: false, message: 'Username already registered' });
  }
  if (await User.findOne({ phone: normalizedPhone })) {
    return res.status(400).json({ success: false, message: 'Phone number already registered' });
  }
  if (normalizedEmail && (await User.findOne({ email: normalizedEmail }))) {
    return res.status(400).json({ success: false, message: 'Email already registered' });
  }

  const user = await User.create({
    name,
    username: normalizedUsername,
    phone: normalizedPhone,
    email: normalizedEmail,
    password: hashPassword(password),
    role: 'admin',
    approved: true,
    status: 'approved',
    isVerified: true,
  });

  const serialized = serializeUser(user);
  publishRealtimeEvent('user.changed', { userId: serialized.id, action: 'created' });
  res.status(201).json({ success: true, user: serialized });
});

router.patch('/:id', async (req, res) => {
  const update = { ...req.body };
  delete update.password;
  if (update.email !== undefined) update.email = normalizeEmail(update.email);
  if (update.phone !== undefined) update.phone = normalizePhone(update.phone);
  if (update.username !== undefined) update.username = normalizeUsername(update.username);
  const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  const serialized = serializeUser(user);
  publishRealtimeEvent('user.changed', { userId: serialized.id, action: 'updated' });
  res.json({ success: true, user: serialized });
});

router.delete('/:id', async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  publishRealtimeEvent('user.changed', { userId: req.params.id, action: 'deleted' });
  res.json({ success: true });
});

module.exports = router;
