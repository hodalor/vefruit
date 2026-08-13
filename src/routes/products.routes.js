const express = require('express');

const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { serializeProduct } = require('../utils/serializers');
const { publishRealtimeEvent } = require('../utils/realtime');

const router = express.Router();

async function loadApprovedFarmerIds() {
  const farmers = await User.find({
    role: 'farmer',
    approved: true,
    status: 'approved',
  }).select('_id');
  return farmers.map((farmer) => String(farmer._id));
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
  const q = String(req.query.q || '').trim().toLowerCase();
  const sellerId = req.query.sellerId;
  const approvedFarmerIds = await loadApprovedFarmerIds();
  const query = { sellerId: { $in: approvedFarmerIds } };
  if (sellerId) {
    if (!approvedFarmerIds.includes(String(sellerId))) {
      return res.json({ success: true, products: [] });
    }
    query.sellerId = sellerId;
  }
  const products = await Product.find(query).sort({ createdAt: -1 });
  if (!q) {
    return res.json({ success: true, products: products.map(serializeProduct) });
  }

  const salesMap = await buildSalesMap();
  const ranked = rankProducts(products, q, salesMap)
    .filter((entry) => entry.score > 0)
    .map((entry) => entry.product);

  return res.json({ success: true, products: ranked.map(serializeProduct) });
});

router.get('/recommendations', async (req, res) => {
  const userId = String(req.query.userId || '').trim();
  const q = String(req.query.q || '').trim().toLowerCase();
  const approvedFarmerIds = await loadApprovedFarmerIds();
  const products = await Product.find({ sellerId: { $in: approvedFarmerIds } }).sort({ createdAt: -1 });
  const salesMap = await buildSalesMap();
  const preferenceCategories = userId ? await loadPreferredCategories(userId) : [];

  const recommendations = products
    .map((product) => ({
      product,
      score: scoreRecommendation(product, { q, salesMap, preferenceCategories }),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((entry) => entry.product);

  res.json({ success: true, products: recommendations.map(serializeProduct) });
});

router.post('/', async (req, res) => {
  const payload = { ...req.body };
  if (!payload.name || !payload.category) {
    return res.status(400).json({ success: false, message: 'Product name and category are required' });
  }
  if (payload.sellerId) {
    const farmer = await findApprovedFarmer(payload.sellerId);
    if (!farmer) {
      return res.status(403).json({ success: false, message: 'Only approved farmers can post products' });
    }
    payload.location = payload.location || farmer.address || farmer.businessAddress || '';
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
  const serialized = serializeProduct(product);
  publishRealtimeEvent('product.changed', { productId: serialized.id, action: 'created' });
  res.status(201).json({ success: true, product: serialized });
});

router.patch('/:id', async (req, res) => {
  const existingProduct = await Product.findById(req.params.id);
  if (!existingProduct) return res.status(404).json({ success: false, message: 'Product not found' });
  const farmer = await findApprovedFarmer(existingProduct.sellerId);
  if (!farmer) {
    return res.status(403).json({ success: false, message: 'Only approved farmers can manage products' });
  }
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
  const serialized = serializeProduct(product);
  publishRealtimeEvent('product.changed', { productId: serialized.id, action: 'updated' });
  res.json({ success: true, product: serialized });
});

router.delete('/:id', async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  publishRealtimeEvent('product.changed', { productId: req.params.id, action: 'deleted' });
  res.json({ success: true });
});

router.get('/:id', async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  const farmer = await findApprovedFarmer(product.sellerId);
  if (!farmer) return res.status(404).json({ success: false, message: 'Product not found' });
  res.json({ success: true, product: serializeProduct(product) });
});

async function buildSalesMap() {
  const orders = await Order.find({}).select('items');
  const sales = new Map();
  orders.forEach((order) => {
    (order.items || []).forEach((item) => {
      const key = String(item.productId);
      sales.set(key, (sales.get(key) || 0) + Number(item.quantity || 0));
    });
  });
  return sales;
}

async function loadPreferredCategories(userId) {
  const orders = await Order.find({ buyerId: userId }).select('items');
  const productIds = Array.from(new Set(orders.flatMap((order) => (order.items || []).map((item) => String(item.productId)))));
  if (!productIds.length) return [];
  const products = await Product.find({ _id: { $in: productIds } }).select('category');
  const counts = new Map();
  products.forEach((product) => {
    const key = String(product.category || '').toLowerCase();
    if (key) counts.set(key, (counts.get(key) || 0) + 1);
  });
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([category]) => category);
}

function rankProducts(products, q, salesMap) {
  return products
    .map((product) => ({ product, score: scoreRecommendation(product, { q, salesMap, preferenceCategories: [] }) }))
    .sort((a, b) => b.score - a.score || new Date(b.product.createdAt) - new Date(a.product.createdAt));
}

function scoreRecommendation(product, { q, salesMap, preferenceCategories }) {
  const name = String(product.name || '').toLowerCase();
  const category = String(product.category || '').toLowerCase();
  const description = String(product.description || '').toLowerCase();
  const tags = Array.isArray(product.tags) ? product.tags.map((tag) => String(tag).toLowerCase()) : [];
  const tokens = q ? q.split(/\s+/).filter(Boolean) : [];
  let score = 0;

  tokens.forEach((token) => {
    if (name.includes(token)) score += 14;
    if (category.includes(token)) score += 10;
    if (tags.some((tag) => tag.includes(token))) score += 8;
    if (description.includes(token)) score += 4;
  });

  if (!tokens.length) score += 4;
  if (preferenceCategories.includes(category)) score += 12;
  score += Math.min(12, salesMap.get(String(product._id)) || 0);
  if (Number(product.inventory ?? product.quantity ?? 0) > 0) score += 3;
  if (String(product.availability || '').toLowerCase() === 'available') score += 2;

  return score;
}

module.exports = router;
