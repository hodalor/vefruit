const express = require('express');

const User = require('../models/User');
const { hashPassword } = require('../utils/hash');
const { serializeUser } = require('../utils/serializers');

const router = express.Router();

router.get('/', async (req, res) => {
  const role = req.query.role;
  const query = role ? { role } : { role: { $in: ['buyer', 'admin'] } };
  const users = await User.find(query).sort({ createdAt: -1 });
  res.json({ success: true, users: users.map(serializeUser) });
});

router.post('/', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
  }
  const exists = await User.findOne({ email: String(email).trim().toLowerCase() });
  if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });

  const user = await User.create({
    name,
    email: String(email).trim().toLowerCase(),
    password: hashPassword(password),
    role: 'admin',
    approved: true,
    status: 'approved',
    isVerified: true,
  });

  res.status(201).json({ success: true, user: serializeUser(user) });
});

router.patch('/:id', async (req, res) => {
  const update = { ...req.body };
  delete update.password;
  const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, user: serializeUser(user) });
});

router.delete('/:id', async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

module.exports = router;
