const express = require('express');

const healthRoutes = require('./health.routes');
const paymentRoutes = require('./payment.routes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/payments', paymentRoutes);

module.exports = router;
