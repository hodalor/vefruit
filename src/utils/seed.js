const User = require('../models/User');
const { hashPassword } = require('./hash');

async function seedDefaults() {
  const adminEmail = 'admin@vefruit.local';
  const admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    await User.create({
      name: 'Admin',
      email: adminEmail,
      role: 'admin',
      password: hashPassword('admin123'),
      approved: true,
      status: 'approved',
      isVerified: true,
    });
  }
}

module.exports = { seedDefaults };
