const mongoose = require('mongoose');
const { seedDefaults } = require('../utils/seed');

let isConnected = false;

async function connectToDatabase() {
  if (isConnected) {
    return mongoose.connection;
  }

  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI is missing in environment variables');
  }

  await mongoose.connect(mongoUri);
  isConnected = true;

  await seedDefaults();
  console.log('MongoDB connected');
  return mongoose.connection;
}

module.exports = connectToDatabase;
