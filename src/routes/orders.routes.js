const express = require('express');

const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { serializeOrder } = require('../utils/serializers');
const { publishRealtimeEvent } = require('../utils/realtime');

const router = express.Router();

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

router.get('/', async (req, res) => {
  const query = {};
  if (req.query.buyerId) query.buyerId = req.query.buyerId;
  if (req.query.sellerId) query['items.sellerId'] = req.query.sellerId;
  const orders = await Order.find(query).sort({ createdAt: -1 });
  res.json({ success: true, orders: orders.map(serializeOrder) });
});

router.post('/', async (req, res) => {
  const { buyerId, items, totalAmount, paymentStatus, orderStatus, neededBy, requestNote, paystackReference } = req.body;
  if (!buyerId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Buyer and order items are required' });
  }

  if (paystackReference) {
    const existing = await Order.findOne({ paystackReference: String(paystackReference).trim() });
    if (existing) {
      return res.json({ success: true, order: serializeOrder(existing) });
    }
  }

  const normalizedItems = [];
  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product) return res.status(404).json({ success: false, message: 'One or more products were not found' });
    const farmer = await findApprovedFarmer(product.sellerId);
    if (!farmer) {
      return res.status(403).json({ success: false, message: 'Only approved farmers can receive orders' });
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
    totalAmount: Number(totalAmount) || 0,
    paymentStatus: paymentStatus || 'pending',
    orderStatus: normalizeOrderStatus(orderStatus),
    neededBy: neededBy || '',
    requestNote: requestNote || '',
    paystackReference: paystackReference || '',
  });

  const serialized = serializeOrder(order);
  publishRealtimeEvent('order.changed', { orderId: serialized.id, action: 'created' });
  publishRealtimeEvent('product.changed', { action: 'inventory-updated' });
  res.status(201).json({ success: true, order: serialized });
});

router.patch('/:id/status', async (req, res) => {
  const nextStatus = normalizeOrderStatus(req.body.status);
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { orderStatus: nextStatus, updatedAt: new Date().toISOString() },
    { new: true }
  );
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  const serialized = serializeOrder(order);
  publishRealtimeEvent('order.changed', { orderId: serialized.id, action: 'updated' });
  res.json({ success: true, order: serialized });
});

module.exports = router;
