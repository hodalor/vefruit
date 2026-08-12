const express = require('express');

const User = require('../models/User');
const { hashPassword } = require('../utils/hash');
const { serializeUser } = require('../utils/serializers');

const router = express.Router();

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizePhone(value) {
  return String(value || '').replace(/\s+/g, '').trim();
}

async function findByIdentifier(identifier, role) {
  const email = normalizeEmail(identifier);
  const phone = normalizePhone(identifier);
  return User.findOne({
    role,
    $or: [{ email }, { phone }],
  });
}

router.post('/register-buyer', async (req, res) => {
  const { name, phone, email, address, idType, idNumber, password } = req.body;
  if (!name || !phone || !password) {
    return res.status(400).json({ success: false, message: 'Name, phone number, and password are required' });
  }

  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);
  if (normalizedEmail && (await User.findOne({ email: normalizedEmail }))) {
    return res.status(400).json({ success: false, message: 'Email already registered' });
  }
  if (await User.findOne({ phone: normalizedPhone })) {
    return res.status(400).json({ success: false, message: 'Phone number already registered' });
  }

  const user = await User.create({
    name,
    phone: normalizedPhone,
    email: normalizedEmail,
    address,
    idType,
    idNumber,
    role: 'buyer',
    approved: true,
    status: 'approved',
    password: hashPassword(password),
  });

  return res.status(201).json({ success: true, user: serializeUser(user) });
});

router.post('/register-farmer', async (req, res) => {
  const { name, phone, email, password } = req.body;
  if (!name || !phone || !password) {
    return res.status(400).json({ success: false, message: 'Name, phone number, and password are required' });
  }

  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);
  if (normalizedEmail && (await User.findOne({ email: normalizedEmail }))) {
    return res.status(400).json({ success: false, message: 'Email already registered' });
  }
  if (await User.findOne({ phone: normalizedPhone })) {
    return res.status(400).json({ success: false, message: 'Phone number already registered' });
  }

  const user = await User.create({
    ...req.body,
    phone: normalizedPhone,
    email: normalizedEmail,
    role: 'farmer',
    approved: false,
    status: 'pending',
    password: hashPassword(password),
  });

  return res.status(201).json({ success: true, user: serializeUser(user) });
});

router.post('/login-user', async (req, res) => {
  const { identifier, password } = req.body;
  const user = await findByIdentifier(identifier, { $in: ['buyer', 'admin'] });
  if (!user || user.password !== hashPassword(password)) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
  return res.json({ success: true, user: serializeUser(user) });
});

router.post('/login-farmer', async (req, res) => {
  const { identifier, password } = req.body;
  const user = await User.findOne({
    role: 'farmer',
    $or: [{ email: normalizeEmail(identifier) }, { phone: normalizePhone(identifier) }],
  });

  if (!user || user.password !== hashPassword(password)) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
  if (!user.approved || ['rejected', 'suspended', 'blocked'].includes(user.status)) {
    const reason = user.status === 'pending' ? 'not approved' : user.status;
    return res.status(403).json({ success: false, message: `Farmer ${reason}` });
  }

  return res.json({ success: true, user: serializeUser(user) });
});

module.exports = router;
