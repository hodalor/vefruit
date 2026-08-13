const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, trim: true, lowercase: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    address: { type: String, trim: true, default: '' },
    idType: { type: String, trim: true, default: '' },
    idNumber: { type: String, trim: true, default: '' },
    role: { type: String, enum: ['buyer', 'farmer', 'admin'], required: true },
    password: { type: String, required: true },
    approved: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'suspended', 'blocked'], default: 'pending' },
    businessName: { type: String, trim: true, default: '' },
    businessAddress: { type: String, trim: true, default: '' },
    businessPhone: { type: String, trim: true, default: '' },
    registrationNumber: { type: String, trim: true, default: '' },
    bankName: { type: String, trim: true, default: '' },
    branchName: { type: String, trim: true, default: '' },
    branchCode: { type: String, trim: true, default: '' },
    accountName: { type: String, trim: true, default: '' },
    accountNumber: { type: String, trim: true, default: '' },
    mobileMoneyNumber: { type: String, trim: true, default: '' },
    mobileMoneyMtnName: { type: String, trim: true, default: '' },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
