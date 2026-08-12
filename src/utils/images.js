function websiteImage(prompt, imageSize = 'landscape_16_9') {
  const encoded = encodeURIComponent(prompt);
  return `https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=${encoded}&image_size=${imageSize}`;
}

export const HERO_FALLBACK_IMAGE = websiteImage(
  'Fresh vegetable and fruit marketplace hero banner, realistic farm produce display with mangoes watermelon cabbage tomatoes and leafy greens, bright natural daylight, premium ecommerce photography, clean composition',
  'landscape_16_9'
);

export const PRODUCT_FALLBACK_IMAGE = websiteImage(
  'Fresh mixed farm produce product photo for ecommerce, realistic basket of vegetables and fruits including mango watermelon cabbage tomatoes and peppers, studio quality lighting, clean background',
  'landscape_4_3'
);

export const SLIDE_FALLBACK_IMAGE = websiteImage(
  'Fresh produce promotional website banner, colorful vegetables and fruits arranged for an online farm marketplace, realistic commercial photography, inviting composition',
  'landscape_16_9'
);

export const THUMB_FALLBACK_IMAGE = websiteImage(
  'Fresh produce square thumbnail for ecommerce admin gallery, realistic vegetables and fruits closeup, clean background, sharp focus',
  'square_hd'
);

export function resolveImageSource(source, fallback = PRODUCT_FALLBACK_IMAGE, size = 'landscape_4_3') {
  const base = String(source || '').trim();
  if (!base) return fallback;
  if (base.startsWith('data:')) return base;
  if (base.startsWith('http://') || base.startsWith('https://')) {
    const hostPath = base.replace(/^https?:\/\//, '');
    return `https://images.weserv.nl/?url=${hostPath}&w=${size.startsWith('landscape') ? 1200 : 800}&h=${size === 'square_hd' ? 1200 : 900}&fit=cover`;
  }
  return base;
}

export function resolveProductImage(product) {
  return resolveImageSource(product?.image || product?.images?.[0], PRODUCT_FALLBACK_IMAGE, 'landscape_4_3');
}
