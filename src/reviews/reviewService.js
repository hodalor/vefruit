import { api } from '../api/client';

export async function loadSellerReviews(sellerId) {
  if (!sellerId) return { reviews: [], summary: { averageRating: 0, reviewCount: 0 } };
  const data = await api.get(`/seller-reviews?sellerId=${encodeURIComponent(sellerId)}`);
  return {
    reviews: data.reviews || [],
    summary: data.summary || { averageRating: 0, reviewCount: 0 },
  };
}

export async function saveSellerReview(payload) {
  const data = await api.post('/seller-reviews', payload);
  return {
    review: data.review,
    summary: data.summary || { averageRating: 0, reviewCount: 0 },
  };
}
