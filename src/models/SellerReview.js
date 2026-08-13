const mongoose = require('mongoose');

const sellerReviewSchema = new mongoose.Schema(
  {
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

sellerReviewSchema.index({ sellerId: 1, buyerId: 1 }, { unique: true });

module.exports = mongoose.model('SellerReview', sellerReviewSchema);
