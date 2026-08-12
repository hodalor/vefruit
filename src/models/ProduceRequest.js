const mongoose = require('mongoose');

const produceRequestSchema = new mongoose.Schema(
  {
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    buyerName: { type: String, required: true, trim: true },
    buyerPhone: { type: String, trim: true, default: '' },
    desiredProduct: { type: String, required: true, trim: true },
    category: { type: String, trim: true, lowercase: true, default: '' },
    quantity: { type: Number, default: 1, min: 1 },
    neededBy: { type: String, default: '' },
    location: { type: String, trim: true, default: '' },
    note: { type: String, trim: true, default: '' },
    status: { type: String, trim: true, default: 'open' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ProduceRequest', produceRequestSchema);
