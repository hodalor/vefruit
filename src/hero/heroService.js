import { api } from '../api/client';

const HERO_EVENT = 'vefruit-hero-changed';

function emitHeroChange() {
  window.dispatchEvent(new Event(HERO_EVENT));
}

export async function loadHeroSlides() {
  const data = await api.get('/hero-slides');
  return data.slides || [];
}

export async function addHeroSlide(slide) {
  const data = await api.post('/hero-slides', slide);
  emitHeroChange();
  return data.slide;
}

export async function updateHeroSlide(id, patch) {
  const data = await api.patch(`/hero-slides/${id}`, patch);
  emitHeroChange();
  return data.slide;
}

export async function deleteHeroSlide(id) {
  await api.delete(`/hero-slides/${id}`);
  emitHeroChange();
  return true;
}

export async function reorderHeroSlides(idsInOrder) {
  const data = await api.post('/hero-slides/reorder', { ids: idsInOrder });
  emitHeroChange();
  return data.slides || [];
}

export function getHeroEventName() {
  return HERO_EVENT;
}
