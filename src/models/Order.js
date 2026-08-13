const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [orderItemSchema], default: [] },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentStatus: { type: String, default: 'pending' },
    orderStatus: { type: String, default: 'processing' },
    neededBy: { type: String, default: '' },
    requestNote: { type: String, default: '' },
    paystackReference: { type: String, default: '' },
    finalizationStatus: { type: String, default: 'complete' },
    finalizationOwner: { type: String, default: '' },
    finalizationLeaseExpiresAt: { type: Date, default: null },
    finalizationError: { type: String, default: '' },
  },
  { timestamps: true }
);

orderSchema.index(
  { paystackReference: 1 },
  {
    unique: true,
    partialFilterExpression: {
      paystackReference: { $type: 'string', $gt: '' },
    },
  }
);

module.exports = mongoose.model('Order', orderSchema);
