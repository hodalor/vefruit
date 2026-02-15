const ORDERS_KEY = 'vefruit_orders_v1';

export function loadOrders() {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOrder(order) {
  const orders = loadOrders();
  const withId = { id: Date.now(), ...order };
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify([withId, ...orders]));
  } catch {}
  return withId;
}

export function updateOrderStatus(id, status) {
  const orders = loadOrders();
  const updated = orders.map((o) => (o.id === id ? { ...o, orderStatus: status, updatedAt: new Date().toISOString() } : o));
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(updated));
  } catch {}
  return updated.find((o) => o.id === id);
}
