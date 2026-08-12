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

export async function addCategory({ name, parentId = '' }) {
  const next = normalizeCategory(name);
  if (!next) throw new Error('Category name is required');
  const data = await api.post('/categories', { name: next, parentId: parentId || null });
  emitCategoriesChange();
  return data.category;
}

export async function updateCategory(id, { name, parentId = '' }) {
  const next = normalizeCategory(name);
  if (!next) throw new Error('Category name is required');
  const data = await api.patch(`/categories/${encodeURIComponent(id)}`, { name: next, parentId: parentId || null });
  emitCategoriesChange();
  return data.category;
}

export async function deleteCategory(category) {
  const id = getCategoryId(category);
  if (!id) throw new Error('Category id is required');
  await api.delete(`/categories/${encodeURIComponent(id)}`);
  emitCategoriesChange();
}

export function getCategoryId(category) {
  return String(category?.id || category || '').trim();
}

export function getCategoryValue(category) {
  return String(category?.name || category || '').trim().toLowerCase();
}

export function formatCategoryLabel(category) {
  const source = String(category?.label || category?.name || category || '').trim();
  return source
    .split(' ')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

export function getCategoryEventName() {
  return CATEGORY_EVENT;
}
