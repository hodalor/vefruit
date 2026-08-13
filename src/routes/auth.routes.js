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

async function findByIdentifier(identifier, role) {
  const email = normalizeEmail(identifier);
  const phone = normalizePhone(identifier);
  const username = normalizeUsername(identifier);
  return User.findOne({
    role,
    $or: [{ email }, { phone }, { username }],
  });
}

async function findAnyByIdentifier(identifier) {
  const email = normalizeEmail(identifier);
  const phone = normalizePhone(identifier);
  const username = normalizeUsername(identifier);
  return User.findOne({
    $or: [{ email }, { phone }, { username }],
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
    isVerified: false,
    password: hashPassword(password),
  });

  const serialized = serializeUser(user);
  publishRealtimeEvent('user.changed', { userId: serialized.id, action: 'created' });
  return res.status(201).json({ success: true, user: serialized });
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
    isVerified: false,
    password: hashPassword(password),
  });

  const serialized = serializeUser(user);
  publishRealtimeEvent('farmer.changed', { farmerId: serialized.id, action: 'created' });
  return res.status(201).json({ success: true, user: serialized });
});

router.post('/login-user', async (req, res) => {
  const { identifier, password } = req.body;
  const user = await findByIdentifier(identifier, { $in: ['buyer', 'admin'] });
  if (!user || user.password !== hashPassword(password)) {
    const otherAccount = await findAnyByIdentifier(identifier);
    if (otherAccount?.role === 'farmer' && otherAccount.password === hashPassword(password)) {
      return res.status(403).json({ success: false, message: 'This account is registered as a farmer. Use Farmer Login.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
  return res.json({ success: true, user: serializeUser(user) });
});

router.post('/login', async (req, res) => {
  const { identifier, password } = req.body;
  const user = await findAnyByIdentifier(identifier);

  if (!user || user.password !== hashPassword(password)) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  if (user.role === 'farmer') {
    if (!user.approved || ['rejected', 'suspended', 'blocked'].includes(user.status)) {
      const reason = user.status === 'pending' ? 'not approved' : user.status;
      return res.status(403).json({ success: false, message: `Farmer ${reason}` });
    }
  }

  return res.json({ success: true, user: serializeUser(user) });
});

router.post('/login-farmer', async (req, res) => {
  const { identifier, password } = req.body;
  const user = await User.findOne({
    role: 'farmer',
    $or: [
      { email: normalizeEmail(identifier) },
      { phone: normalizePhone(identifier) },
      { username: normalizeUsername(identifier) },
    ],
  });

  if (!user || user.password !== hashPassword(password)) {
    const otherAccount = await findAnyByIdentifier(identifier);
    if (otherAccount && ['buyer', 'admin'].includes(otherAccount.role) && otherAccount.password === hashPassword(password)) {
      return res.status(403).json({
        success: false,
        message: otherAccount.role === 'admin'
          ? 'This account is registered as an admin. Use Admin Login.'
          : 'This account is registered as a buyer. Use Login.',
      });
    }
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
  if (!user.approved || ['rejected', 'suspended', 'blocked'].includes(user.status)) {
    const reason = user.status === 'pending' ? 'not approved' : user.status;
    return res.status(403).json({ success: false, message: `Farmer ${reason}` });
  }

  return res.json({ success: true, user: serializeUser(user) });
});

module.exports = router;
