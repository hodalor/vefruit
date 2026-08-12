const express = require('express');

const { addRealtimeClient } = require('../utils/realtime');

const router = express.Router();

router.get('/stream', (req, res) => {
  addRealtimeClient(req, res);
});

module.exports = router;
