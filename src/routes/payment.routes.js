const express = require('express');

const getPaystackClient = require('../config/paystack');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { serializeOrder } = require('../utils/serializers');
const { publishRealtimeEvent } = require('../utils/realtime');

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

router.post('/finalize', async (req, res, next) => {
  try {
    const reference = String(req.body.reference || '').trim();
    const orderPayload = req.body.order || {};

    if (!reference) {
      return res.status(400).json({ success: false, message: 'Payment reference is required' });
    }

    const existingOrder = await Order.findOne({ paystackReference: reference });
    if (existingOrder) {
      return res.json({ success: true, order: serializeOrder(existingOrder) });
    }

    const paystack = getPaystackClient();
    const response = await paystack.get(`/transaction/verify/${reference}`);
    const payment = response.data.data || {};
    const paymentStatus = String(payment.status || '').trim().toLowerCase();

    if (paymentStatus !== 'success') {
      return res.status(409).json({
        success: false,
        message: 'Payment confirmation is still pending',
        paymentStatus,
      });
    }

    const { buyerId, items, totalAmount, neededBy, requestNote } = orderPayload;
    if (!buyerId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Buyer and order items are required' });
    }

    const normalizedItems = [];
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ success: false, message: 'One or more products were not found' });
      }

      const requestedQty = Number(item.quantity || item.qty || 0);
      if (requestedQty < 1) {
        return res.status(400).json({ success: false, message: 'Each item quantity must be at least 1' });
      }

      const nextInventory = Math.max(0, Number(product.inventory ?? product.quantity ?? 0) - requestedQty);
      product.inventory = nextInventory;
      product.quantity = nextInventory;
      await product.save();

      normalizedItems.push({
        productId: product._id,
        quantity: requestedQty,
        price: Number(item.price) || product.price || 0,
        sellerId: product.sellerId,
      });
    }

    const order = await Order.create({
      buyerId,
      items: normalizedItems,
      totalAmount: Number(totalAmount) || Number(payment.amount || 0) / 100 || 0,
      paymentStatus: 'paid',
      orderStatus: 'processing',
      neededBy: neededBy || '',
      requestNote: requestNote || '',
      paystackReference: reference,
    });

    const serialized = serializeOrder(order);
    publishRealtimeEvent('order.changed', { orderId: serialized.id, action: 'created' });
    publishRealtimeEvent('product.changed', { action: 'inventory-updated' });
    return res.json({ success: true, order: serialized });
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
