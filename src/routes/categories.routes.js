const express = require('express');

const Category = require('../models/Category');
const { publishRealtimeEvent } = require('../utils/realtime');

const router = express.Router();

router.get('/', async (_req, res) => {
  const categories = await Category.find({}).sort({ name: 1 }).lean();
  const serialized = serializeCategories(categories);
  res.json({ success: true, categories: serialized });
});

router.post('/', async (req, res) => {
  const name = String(req.body.name || '').trim().toLowerCase();
  const parentId = String(req.body.parentId || '').trim() || null;
  if (!name) return res.status(400).json({ success: false, message: 'Category name is required' });

  let parent = null;
  if (parentId) {
    parent = await Category.findById(parentId);
    if (!parent) return res.status(404).json({ success: false, message: 'Parent category not found' });
  }

  const exists = await Category.findOne({ name });
  if (exists) return res.status(400).json({ success: false, message: 'Category already exists' });

  const category = await Category.create({ name, parentId: parent ? parent._id : null });
  const categories = await Category.find({}).sort({ name: 1 }).lean();
  const serialized = serializeCategories(categories);
  res.status(201).json({
    success: true,
    category: serialized.find((entry) => String(entry.id) === String(category._id)),
  });
  publishRealtimeEvent('category.changed', { categoryId: String(category._id), action: 'created' });
});

router.patch('/:id', async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

  const nextName = String(req.body.name || '').trim().toLowerCase();
  const nextParentId = String(req.body.parentId || '').trim() || null;
  if (!nextName) return res.status(400).json({ success: false, message: 'Category name is required' });
  if (nextParentId && nextParentId === String(category._id)) {
    return res.status(400).json({ success: false, message: 'A category cannot be its own parent' });
  }
  if (await Category.findOne({ name: nextName, _id: { $ne: category._id } })) {
    return res.status(400).json({ success: false, message: 'Category already exists' });
  }

  let parent = null;
  if (nextParentId) {
    parent = await Category.findById(nextParentId);
    if (!parent) return res.status(404).json({ success: false, message: 'Parent category not found' });
  }

  category.name = nextName;
  category.parentId = parent ? parent._id : null;
  await category.save();

  const categories = await Category.find({}).sort({ name: 1 }).lean();
  const serialized = serializeCategories(categories);
  publishRealtimeEvent('category.changed', { categoryId: String(category._id), action: 'updated' });
  res.json({
    success: true,
    category: serialized.find((entry) => String(entry.id) === String(category._id)),
  });
});

router.delete('/:id', async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

  const childCount = await Category.countDocuments({ parentId: category._id });
  if (childCount > 0) {
    return res.status(400).json({ success: false, message: 'Delete child categories first' });
  }

  await Category.deleteOne({ _id: category._id });
  publishRealtimeEvent('category.changed', { categoryId: String(category._id), action: 'deleted' });
  res.json({ success: true });
});

function serializeCategories(categories) {
  const byId = new Map(categories.map((item) => [String(item._id), item]));
  const childrenByParent = new Map();

  categories.forEach((item) => {
    const parentKey = item.parentId ? String(item.parentId) : 'root';
    const current = childrenByParent.get(parentKey) || [];
    current.push(item);
    childrenByParent.set(parentKey, current);
  });

  for (const entries of childrenByParent.values()) {
    entries.sort((a, b) => a.name.localeCompare(b.name));
  }

  const result = [];

  function walk(category, level = 0, path = []) {
    const lineage = [...path, category.name];
    result.push({
      id: String(category._id),
      name: category.name,
      parentId: category.parentId ? String(category.parentId) : null,
      parentName: category.parentId ? byId.get(String(category.parentId))?.name || '' : '',
      level,
      label: lineage.join(' / '),
      path: lineage,
    });

    const children = childrenByParent.get(String(category._id)) || [];
    children.forEach((child) => walk(child, level + 1, lineage));
  }

  (childrenByParent.get('root') || []).forEach((root) => walk(root));
  return result;
}

module.exports = router;
