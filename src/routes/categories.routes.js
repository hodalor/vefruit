const express = require('express');

const Category = require('../models/Category');

const router = express.Router();

router.get('/', async (_req, res) => {
  const categories = await Category.find({}).sort({ name: 1 });
  res.json({ success: true, categories: categories.map((item) => item.name) });
});

router.post('/', async (req, res) => {
  const name = String(req.body.name || '').trim().toLowerCase();
  if (!name) return res.status(400).json({ success: false, message: 'Category name is required' });
  const exists = await Category.findOne({ name });
  if (exists) return res.status(400).json({ success: false, message: 'Category already exists' });
  await Category.create({ name });
  res.status(201).json({ success: true, category: name });
});

router.delete('/:name', async (req, res) => {
  await Category.deleteOne({ name: String(req.params.name || '').trim().toLowerCase() });
  res.json({ success: true });
});

module.exports = router;
