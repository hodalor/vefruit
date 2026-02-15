const HERO_KEY = 'vefruit_hero_v1';

const defaults = [
  {
    id: 1,
    title: 'Fresh Vegetables Daily',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Tomato_je.jpg?width=1200',
    cta: { text: 'Shop Now', href: '/' },
  },
  {
    id: 2,
    title: 'Organic Greens',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Spinach_leaves.jpg?width=1200',
    cta: { text: 'See Vegetables', href: '/' },
  },
  {
    id: 3,
    title: 'Farm-to-Table Fruits',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Red_Apple.jpg?width=1200',
    cta: { text: 'Browse Fruits', href: '/' },
  },
];

export function loadHeroSlides() {
  try {
    const raw = localStorage.getItem(HERO_KEY);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(HERO_KEY, JSON.stringify(defaults));
    return defaults;
  } catch {
    return defaults;
  }
}

export function saveHeroSlides(slides) {
  try { localStorage.setItem(HERO_KEY, JSON.stringify(slides)); } catch {}
}

export function addHeroSlide(slide) {
  const slides = loadHeroSlides();
  const withId = { id: Date.now(), ...slide };
  const updated = [withId, ...slides];
  saveHeroSlides(updated);
  return withId;
}

export function updateHeroSlide(id, patch) {
  const slides = loadHeroSlides();
  const updated = slides.map((s) => (s.id === id ? { ...s, ...patch } : s));
  saveHeroSlides(updated);
  return updated.find((s) => s.id === id);
}

export function deleteHeroSlide(id) {
  const slides = loadHeroSlides();
  const updated = slides.filter((s) => s.id !== id);
  saveHeroSlides(updated);
  return true;
}

export function reorderHeroSlides(idsInOrder) {
  const slides = loadHeroSlides();
  const byId = new Map(slides.map((s) => [s.id, s]));
  const updated = idsInOrder.map((id) => byId.get(id)).filter(Boolean);
  saveHeroSlides(updated);
  return updated;
}
