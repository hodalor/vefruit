const express = require('express');

const Order = require('../models/Order');
const SellerReview = require('../models/SellerReview');
const User = require('../models/User');
const { serializeSellerReview } = require('../utils/serializers');
const { publishRealtimeEvent } = require('../utils/realtime');

const router = express.Router();

router.get('/', async (req, res) => {
  const sellerId = String(req.query.sellerId || '').trim();
  if (!sellerId) {
    return res.json({ success: true, reviews: [], summary: { averageRating: 0, reviewCount: 0 } });
  }

  const reviews = await SellerReview.find({ sellerId }).sort({ createdAt: -1 });
  const reviewCount = reviews.length;
  const averageRating = reviewCount
    ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviewCount
    : 0;

  res.json({
    success: true,
    reviews: reviews.map(serializeSellerReview),
    summary: {
      averageRating: Number(averageRating.toFixed(1)),
      reviewCount,
    },
  });
});

router.post('/', async (req, res) => {
  const sellerId = String(req.body.sellerId || '').trim();
  const buyerId = String(req.body.buyerId || '').trim();
  const reviewText = String(req.body.review || '').trim();
  const rating = Number(req.body.rating || 0);

  if (!sellerId || !buyerId || rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, message: 'Seller, buyer, and a rating from 1 to 5 are required' });
  }

  const [seller, buyer] = await Promise.all([
    User.findOne({ _id: sellerId, role: 'farmer' }),
    User.findOne({ _id: buyerId, role: 'buyer' }),
  ]);
  if (!seller) return res.status(404).json({ success: false, message: 'Seller not found' });
  if (!buyer) return res.status(404).json({ success: false, message: 'Buyer not found' });

  const hasOrder = await Order.exists({
    buyerId,
    'items.sellerId': sellerId,
  });
  if (!hasOrder) {
    return res.status(403).json({ success: false, message: 'Only buyers who have ordered from this seller can leave a review' });
  }

  const review = await SellerReview.findOneAndUpdate(
    { sellerId, buyerId },
    { sellerId, buyerId, rating, review: reviewText },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const reviews = await SellerReview.find({ sellerId });
  const reviewCount = reviews.length;
  const averageRating = reviewCount
    ? reviews.reduce((sum, entry) => sum + Number(entry.rating || 0), 0) / reviewCount
    : 0;

  publishRealtimeEvent('user.changed', { userId: sellerId, action: 'review-updated' });
  res.status(201).json({
    success: true,
    review: serializeSellerReview(review),
    summary: {
      averageRating: Number(averageRating.toFixed(1)),
      reviewCount,
    },
  });
});

module.exports = router;
