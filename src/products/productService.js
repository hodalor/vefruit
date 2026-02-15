import seed from '../products';

const PRODUCTS_KEY = 'vefruit_products_v1';

export function loadProducts() {
  try {
    const raw = localStorage.getItem(PRODUCTS_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      const byId = new Map(list.map((p) => [p.id, p]));
      let changed = false;
      seed.forEach((sp) => {
        const p = byId.get(sp.id);
        if (p) {
          const isPlaceholder = typeof p.image === 'string' && p.image.includes('placehold.co');
          if (!p.image || isPlaceholder) {
            p.image = sp.image;
            if (!p.images || p.images.length === 0) p.images = sp.image ? [sp.image] : [];
            changed = true;
          }
        }
      });
      if (changed) {
        try { localStorage.setItem(PRODUCTS_KEY, JSON.stringify(Array.from(byId.values()))); } catch {}
      }
      return Array.from(byId.values());
    }
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(seed));
    return seed;
  } catch {
    return seed;
  }
}

export function saveProducts(list) {
  try {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(list));
  } catch {}
}

export function addProduct({ name, category, price, image, images, inventory, sellerId, description, tags }) {
  const list = loadProducts();
  const qty = Number(inventory) || 0;
  const imgs = Array.isArray(images) ? images.slice(0, 5) : (image ? [image] : []);
  const tgs = Array.isArray(tags)
    ? tags
    : (typeof tags === 'string' ? tags.split(',').map((s) => s.trim()).filter(Boolean) : []);
  const product = {
    id: Date.now(),
    name,
    description: description || '',
    price: Number(price),
    quantity: qty,
    category,
    images: imgs,
    sellerId: sellerId || null,
    createdAt: new Date().toISOString(),
    image: imgs[0] || image || null,
    inventory: qty,
    tags: tgs,
  };
  const updated = [product, ...list];
  saveProducts(updated);
  return product;
}

export function updateProduct(id, patch) {
  const list = loadProducts();
  const updated = list.map((p) => (p.id === id ? { ...p, ...patch } : p));
  saveProducts(updated);
  return updated.find((p) => p.id === id);
}

export function productsBySeller(sellerId) {
  const list = loadProducts();
  return list.filter((p) => p.sellerId === sellerId);
}

export function deleteProduct(id) {
  const list = loadProducts();
  const updated = list.filter((p) => p.id !== id);
  saveProducts(updated);
  return true;
}
