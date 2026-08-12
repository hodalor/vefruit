const express = require('express');

const HeroSlide = require('../models/HeroSlide');
const { serializeHeroSlide } = require('../utils/serializers');

const router = express.Router();

router.get('/', async (_req, res) => {
  const slides = await HeroSlide.find({}).sort({ order: 1, createdAt: 1 });
  res.json({ success: true, slides: slides.map(serializeHeroSlide) });
});

router.post('/', async (req, res) => {
  const count = await HeroSlide.countDocuments();
  const slide = await HeroSlide.create({
    title: req.body.title,
    image: req.body.image,
    cta: req.body.cta || { text: '', href: '/' },
    order: count,
  });
  res.status(201).json({ success: true, slide: serializeHeroSlide(slide) });
});

router.patch('/:id', async (req, res) => {
  const slide = await HeroSlide.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!slide) return res.status(404).json({ success: false, message: 'Slide not found' });
  res.json({ success: true, slide: serializeHeroSlide(slide) });
});

router.post('/reorder', async (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  await Promise.all(ids.map((id, index) => HeroSlide.findByIdAndUpdate(id, { order: index })));
  const slides = await HeroSlide.find({}).sort({ order: 1, createdAt: 1 });
  res.json({ success: true, slides: slides.map(serializeHeroSlide) });
});

router.delete('/:id', async (req, res) => {
  await HeroSlide.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

module.exports = router;
