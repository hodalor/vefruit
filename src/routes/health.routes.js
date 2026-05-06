const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

router.get('/', (_req, res) => {
  res.json({
    success: true,
    service: 'veFruit backend',
    databaseState: mongoose.connection.readyState,
  });
});

module.exports = router;
