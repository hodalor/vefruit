const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, default: 0 },
    inventory: { type: Number, default: 0 },
    category: { type: String, required: true, trim: true, lowercase: true },
    image: { type: String, default: '' },
    images: { type: [String], default: [] },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    tags: { type: [String], default: [] },
    availability: { type: String, trim: true, default: 'available' },
    location: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
