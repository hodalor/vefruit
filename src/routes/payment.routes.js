const express = require('express');

const getPaystackClient = require('../config/paystack');

const router = express.Router();

router.get('/config', (_req, res) => {
  res.json({
    success: true,
    publicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
  });
});

router.post('/initialize', async (req, res, next) => {
  try {
    const { email, amount, metadata, callback_url: callbackUrl } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Customer email is required' });
    }

    if (!amount) {
      return res.status(400).json({ success: false, message: 'Amount is required' });
    }

    const paystack = getPaystackClient();
    const response = await paystack.post('/transaction/initialize', {
      email,
      amount,
      metadata: metadata || {},
      callback_url: callbackUrl,
    });

    return res.json({
      success: true,
      data: response.data.data,
    });
  } catch (error) {
    return next(extractPaystackError(error));
  }
});

router.get('/verify/:reference', async (req, res, next) => {
  try {
    const paystack = getPaystackClient();
    const response = await paystack.get(`/transaction/verify/${req.params.reference}`);

    return res.json({
      success: true,
      data: response.data.data,
    });
  } catch (error) {
    return next(extractPaystackError(error));
  }
});

function extractPaystackError(error) {
  const message =
    error.response?.data?.message ||
    error.message ||
    'Paystack request failed';
  const err = new Error(message);
  err.statusCode = error.response?.status || 500;
  return err;
}

module.exports = router;
