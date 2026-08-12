import { api } from '../api/client';

const CATEGORY_EVENT = 'vefruit-categories-changed';

function normalizeCategory(value) {
  return String(value || '').trim().toLowerCase();
}

function emitCategoriesChange() {
  window.dispatchEvent(new Event(CATEGORY_EVENT));
}

export async function loadCategories() {
  const data = await api.get('/categories');
  return data.categories || [];
}

export async function addCategory(name) {
  const next = normalizeCategory(name);
  if (!next) throw new Error('Category name is required');
  const data = await api.post('/categories', { name: next });
  emitCategoriesChange();
  return data.category;
}

export async function deleteCategory(name) {
  const next = normalizeCategory(name);
  await api.delete(`/categories/${encodeURIComponent(next)}`);
  emitCategoriesChange();
}

export function formatCategoryLabel(name) {
  return String(name || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

export function getCategoryEventName() {
  return CATEGORY_EVENT;
}
