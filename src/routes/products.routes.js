const express = require('express');

const Product = require('../models/Product');
const User = require('../models/User');
const { serializeProduct } = require('../utils/serializers');

const router = express.Router();

router.get('/', async (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const sellerId = req.query.sellerId;
  const query = {};
  if (sellerId) query.sellerId = sellerId;
  if (q) {
    query.$or = [
      { name: { $regex: q, $options: 'i' } },
      { category: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
    ];
  }
  const products = await Product.find(query).sort({ createdAt: -1 });
  res.json({ success: true, products: products.map(serializeProduct) });
});

router.get('/:id', async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  res.json({ success: true, product: serializeProduct(product) });
});

router.post('/', async (req, res) => {
  const payload = { ...req.body };
  if (!payload.name || !payload.category) {
    return res.status(400).json({ success: false, message: 'Product name and category are required' });
  }
  if (payload.sellerId) {
    const farmer = await User.findById(payload.sellerId);
    if (farmer) {
      payload.location = payload.location || farmer.address || farmer.businessAddress || '';
    }
  }
  payload.price = Number(payload.price) || 0;
  payload.inventory = Number(payload.inventory ?? payload.quantity) || 0;
  payload.quantity = payload.inventory;
  payload.category = String(payload.category).trim().toLowerCase();
  payload.tags = Array.isArray(payload.tags)
    ? payload.tags
    : String(payload.tags || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
  payload.images = Array.isArray(payload.images) ? payload.images.slice(0, 5) : [];
  payload.image = payload.image || payload.images[0] || '';

  const product = await Product.create(payload);
  res.status(201).json({ success: true, product: serializeProduct(product) });
});

router.patch('/:id', async (req, res) => {
  const payload = { ...req.body };
  if (payload.category) payload.category = String(payload.category).trim().toLowerCase();
  if (payload.inventory !== undefined) {
    payload.inventory = Number(payload.inventory) || 0;
    payload.quantity = payload.inventory;
  }
  if (payload.tags && !Array.isArray(payload.tags)) {
    payload.tags = String(payload.tags)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  const product = await Product.findByIdAndUpdate(req.params.id, payload, { new: true });
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  res.json({ success: true, product: serializeProduct(product) });
});

router.delete('/:id', async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

module.exports = router;
