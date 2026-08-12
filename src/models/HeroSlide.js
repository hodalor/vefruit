const mongoose = require('mongoose');

const heroSlideSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    image: { type: String, required: true, trim: true },
    cta: {
      text: { type: String, trim: true, default: '' },
      href: { type: String, trim: true, default: '/' },
    },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('HeroSlide', heroSlideSchema);
