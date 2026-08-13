const express = require('express');
const mongoose = require('mongoose');

const getPaystackClient = require('../config/paystack');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { serializeOrder } = require('../utils/serializers');
const { publishRealtimeEvent } = require('../utils/realtime');

const router = express.Router();
const FINALIZATION_LEASE_MS = 30000;

function normalizeOrderStatus(status) {
  const next = String(status || '').trim().toLowerCase();
  if (next === 'packed') return 'packaged';
  if (next === 'shipped') return 'sent-for-delivery';
  return next || 'processing';
}

async function findApprovedFarmer(id) {
  if (!id) return null;
  return User.findOne({
    _id: id,
    role: 'farmer',
    approved: true,
    status: 'approved',
  });
}

function parseMaybeJson(value) {
  if (value === undefined || value === null) return value;
  if (typeof value === 'object') return value;
  const text = String(value).trim();
  if (!text) return '';
  try {
    return JSON.parse(text);
  } catch (_error) {
    return value;
  }
}

function buildRecoverableOrderPayload(orderPayload = {}, payment = {}) {
  const metadata = parseMaybeJson(payment.metadata) || {};
  const metadataOrder = parseMaybeJson(metadata.order) || {};
  const metadataItems = parseMaybeJson(metadata.items);
  const items = Array.isArray(orderPayload.items) && orderPayload.items.length > 0
    ? orderPayload.items
    : (Array.isArray(metadataOrder.items) && metadataOrder.items.length > 0
      ? metadataOrder.items
      : (Array.isArray(metadataItems) ? metadataItems : []));

  return {
    buyerId: String(orderPayload.buyerId || metadataOrder.buyerId || metadata.buyerId || '').trim(),
    items,
    totalAmount: Number(
      orderPayload.totalAmount
      ?? metadataOrder.totalAmount
      ?? metadata.totalAmount
      ?? ((Number(payment.amount || 0) / 100) || 0)
    ),
    neededBy: String(orderPayload.neededBy || metadataOrder.neededBy || metadata.neededBy || '').trim(),
    requestNote: String(orderPayload.requestNote || metadataOrder.requestNote || metadata.requestNote || '').trim(),
  };
}

function isCompletedOrder(order) {
  return !!order && order.finalizationStatus === 'complete' && Array.isArray(order.items) && order.items.length > 0;
}

function buildFinalizationFields(reference, payload, payment = {}) {
  return {
    buyerId: payload.buyerId,
    totalAmount: Number(payload.totalAmount) || Number(payment.amount || 0) / 100 || 0,
    paymentStatus: 'paid',
    orderStatus: normalizeOrderStatus('processing'),
    neededBy: payload.neededBy || '',
    requestNote: payload.requestNote || '',
    paystackReference: reference,
  };
}

async function restoreInventory(adjustments = []) {
  for (const adjustment of adjustments) {
    if (!adjustment?.productId || !adjustment?.quantity) continue;
    await Product.findByIdAndUpdate(adjustment.productId, {
      $inc: {
        inventory: adjustment.quantity,
        quantity: adjustment.quantity,
      },
    });
  }
}

async function markFinalizationFailed(orderId, owner, message) {
  if (!orderId || !owner) return;
  await Order.findOneAndUpdate(
    { _id: orderId, finalizationOwner: owner },
    {
      $set: {
        items: [],
        finalizationStatus: 'failed',
        finalizationOwner: '',
        finalizationLeaseExpiresAt: null,
        finalizationError: String(message || 'Unable to finalize payment'),
      },
    }
  );
}

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
  let claimedOrder = null;
  let finalizationOwner = '';
  const inventoryAdjustments = [];
  let finalized = false;

  try {
    const reference = String(req.body.reference || '').trim();
    const orderPayload = req.body.order || {};
    const now = new Date();

    if (!reference) {
      return res.status(400).json({ success: false, message: 'Payment reference is required' });
    }

    const existingOrder = await Order.findOne({ paystackReference: reference });
    if (isCompletedOrder(existingOrder)) {
      return res.json({ success: true, order: serializeOrder(existingOrder) });
    }
    if (
      existingOrder &&
      existingOrder.finalizationStatus === 'processing' &&
      existingOrder.finalizationLeaseExpiresAt &&
      new Date(existingOrder.finalizationLeaseExpiresAt).getTime() > now.getTime()
    ) {
      return res.status(409).json({
        success: false,
        message: 'Order finalization is already in progress',
      });
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

    const { buyerId, items, totalAmount, neededBy, requestNote } = buildRecoverableOrderPayload(orderPayload, payment);
    if (!buyerId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Buyer and order items are required' });
    }

    finalizationOwner = new mongoose.Types.ObjectId().toString();
    const leaseExpiresAt = new Date(Date.now() + FINALIZATION_LEASE_MS);
    const sharedFields = buildFinalizationFields(reference, { buyerId, totalAmount, neededBy, requestNote }, payment);

    if (existingOrder) {
      claimedOrder = await Order.findOneAndUpdate(
        {
          _id: existingOrder._id,
          $or: [
            { finalizationStatus: 'failed' },
            { finalizationStatus: 'processing', finalizationLeaseExpiresAt: { $lte: now } },
            { finalizationStatus: 'processing', finalizationLeaseExpiresAt: null },
          ],
        },
        {
          $set: {
            ...sharedFields,
            items: [],
            finalizationStatus: 'processing',
            finalizationOwner,
            finalizationLeaseExpiresAt: leaseExpiresAt,
            finalizationError: '',
          },
        },
        { new: true }
      );
    } else {
      try {
        claimedOrder = await Order.create({
          ...sharedFields,
          items: [],
          finalizationStatus: 'processing',
          finalizationOwner,
          finalizationLeaseExpiresAt: leaseExpiresAt,
          finalizationError: '',
        });
      } catch (error) {
        if (error?.code !== 11000) throw error;
        const duplicateOrder = await Order.findOne({ paystackReference: reference });
        if (isCompletedOrder(duplicateOrder)) {
          return res.json({ success: true, order: serializeOrder(duplicateOrder) });
        }
        if (
          duplicateOrder &&
          duplicateOrder.finalizationStatus === 'processing' &&
          duplicateOrder.finalizationLeaseExpiresAt &&
          new Date(duplicateOrder.finalizationLeaseExpiresAt).getTime() > Date.now()
        ) {
          return res.status(409).json({
            success: false,
            message: 'Order finalization is already in progress',
          });
        }
        throw error;
      }
    }

    if (!claimedOrder) {
      const latestOrder = await Order.findOne({ paystackReference: reference });
      if (isCompletedOrder(latestOrder)) {
        return res.json({ success: true, order: serializeOrder(latestOrder) });
      }
      return res.status(409).json({
        success: false,
        message: 'Order finalization is already in progress',
      });
    }

    const normalizedItems = [];
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        await markFinalizationFailed(claimedOrder._id, finalizationOwner, 'One or more products were not found');
        return res.status(404).json({ success: false, message: 'One or more products were not found' });
      }
      const farmer = await findApprovedFarmer(product.sellerId);
      if (!farmer) {
        await markFinalizationFailed(claimedOrder._id, finalizationOwner, 'Only approved farmers can receive orders');
        return res.status(403).json({ success: false, message: 'Only approved farmers can receive orders' });
      }

      const requestedQty = Number(item.quantity || item.qty || 0);
      if (requestedQty < 1) {
        await markFinalizationFailed(claimedOrder._id, finalizationOwner, 'Each item quantity must be at least 1');
        return res.status(400).json({ success: false, message: 'Each item quantity must be at least 1' });
      }

      const availableInventory = Number(product.inventory ?? product.quantity ?? 0);
      if (requestedQty > availableInventory) {
        await markFinalizationFailed(claimedOrder._id, finalizationOwner, `Insufficient stock for ${product.name}`);
        return res.status(409).json({
          success: false,
          message: `Insufficient stock for ${product.name}`,
        });
      }

      const nextInventory = Math.max(0, availableInventory - requestedQty);
      product.inventory = nextInventory;
      product.quantity = nextInventory;
      await product.save();
      inventoryAdjustments.push({ productId: product._id, quantity: requestedQty });

      normalizedItems.push({
        productId: product._id,
        quantity: requestedQty,
        price: Number(item.price) || product.price || 0,
        sellerId: product.sellerId,
      });
    }

    const order = await Order.findOneAndUpdate(
      { _id: claimedOrder._id, finalizationOwner },
      {
        items: normalizedItems,
        totalAmount: Number(totalAmount) || Number(payment.amount || 0) / 100 || 0,
        paymentStatus: 'paid',
        orderStatus: normalizeOrderStatus('processing'),
        neededBy: neededBy || '',
        requestNote: requestNote || '',
        finalizationStatus: 'complete',
        finalizationOwner: '',
        finalizationLeaseExpiresAt: null,
        finalizationError: '',
      },
      { new: true }
    );

    if (!order) {
      throw new Error('Unable to finalize order ownership');
    }
    finalized = true;

    const serialized = serializeOrder(order);
    publishRealtimeEvent('order.changed', { orderId: serialized.id, action: 'created' });
    publishRealtimeEvent('product.changed', { action: 'inventory-updated' });
    return res.json({ success: true, order: serialized });
  } catch (error) {
    if (!finalized && inventoryAdjustments.length > 0) {
      await restoreInventory(inventoryAdjustments);
    }
    if (!finalized && claimedOrder?._id && finalizationOwner) {
      await markFinalizationFailed(claimedOrder._id, finalizationOwner, error.message || 'Unable to finalize payment');
    }
    if (error?.code === 11000) {
      const reference = String(req.body.reference || '').trim();
      const existingOrder = reference ? await Order.findOne({ paystackReference: reference }) : null;
      if (existingOrder) {
        if (isCompletedOrder(existingOrder)) {
          return res.json({ success: true, order: serializeOrder(existingOrder) });
        }
        return res.status(409).json({
          success: false,
          message: 'Order finalization is already in progress',
        });
      }
    }
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
