import { api } from '../api/client';

const PRODUCT_EVENT = 'vefruit-products-changed';

function normalizeCategory(value) {
  return String(value || '').trim().toLowerCase();
}

function emitProductsChange() {
  window.dispatchEvent(new Event(PRODUCT_EVENT));
}

export async function loadProducts(params = {}) {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.sellerId) query.set('sellerId', params.sellerId);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const data = await api.get(`/products${suffix}`);
  return data.products || [];
}

export async function getProduct(id) {
  const data = await api.get(`/products/${id}`);
  return data.product;
}

export async function loadRecommendations(params = {}) {
  const query = new URLSearchParams();
  if (params.userId) query.set('userId', params.userId);
  if (params.q) query.set('q', params.q);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const data = await api.get(`/products/recommendations${suffix}`);
  return data.products || [];
}

export async function addProduct({ name, category, price, image, images, inventory, sellerId, description, tags, location, availability }) {
  const imgs = Array.isArray(images) ? images.slice(0, 5) : (image ? [image] : []);
  const tgs = Array.isArray(tags)
    ? tags
    : String(tags || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
  const data = await api.post('/products', {
    name,
    category: normalizeCategory(category),
    price: Number(price),
    inventory: Number(inventory) || 0,
    sellerId,
    description: description || '',
    image: imgs[0] || image || '',
    images: imgs,
    tags: tgs,
    location: location || '',
    availability: availability || 'available',
  });
  emitProductsChange();
  return data.product;
}

export async function updateProduct(id, patch) {
  const data = await api.patch(`/products/${id}`, patch);
  emitProductsChange();
  return data.product;
}

export async function productsBySeller(sellerId) {
  return loadProducts({ sellerId });
}

export async function deleteProduct(id) {
  await api.delete(`/products/${id}`);
  emitProductsChange();
  return true;
}

export function getProductEventName() {
  return PRODUCT_EVENT;
}
