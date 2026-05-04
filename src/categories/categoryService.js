const CATEGORIES_KEY = 'vefruit_categories_v1';
const PRODUCTS_KEY = 'vefruit_products_v1';
const CATEGORY_EVENT = 'vefruit-categories-changed';

const DEFAULT_CATEGORIES = ['fruit', 'vegetable', 'organic', 'fresh picks'];

function normalizeCategory(value) {
  return String(value || '').trim().toLowerCase();
}

function uniqueCategories(list) {
  return Array.from(new Set(list.map(normalizeCategory).filter(Boolean)));
}

function emitCategoriesChange() {
  window.dispatchEvent(new Event(CATEGORY_EVENT));
}

function loadProductCategories() {
  try {
    const raw = localStorage.getItem(PRODUCTS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return uniqueCategories(list.map((product) => product.category));
  } catch {
    return [];
  }
}

export function loadCategories() {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    const stored = raw ? JSON.parse(raw) : [];
    const merged = uniqueCategories([...DEFAULT_CATEGORIES, ...stored, ...loadProductCategories()]);
    if (JSON.stringify(stored) !== JSON.stringify(merged)) {
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(merged));
    }
    return merged;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export function saveCategories(list) {
  const normalized = uniqueCategories(list);
  try {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(normalized));
  } catch {}
  emitCategoriesChange();
}

export function addCategory(name) {
  const next = normalizeCategory(name);
  if (!next) throw new Error('Category name is required');
  const list = loadCategories();
  if (list.includes(next)) throw new Error('Category already exists');
  const updated = [...list, next];
  saveCategories(updated);
  return next;
}

export function deleteCategory(name) {
  const next = normalizeCategory(name);
  const updated = loadCategories().filter((entry) => entry !== next);
  saveCategories(updated);
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
