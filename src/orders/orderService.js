import { api } from '../api/client';

const ORDER_EVENT = 'vefruit-orders-changed';

function emitOrdersChange() {
  window.dispatchEvent(new Event(ORDER_EVENT));
}

export async function loadOrders(params = {}) {
  const query = new URLSearchParams();
  if (params.buyerId) query.set('buyerId', params.buyerId);
  if (params.sellerId) query.set('sellerId', params.sellerId);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const data = await api.get(`/orders${suffix}`);
  return data.orders || [];
}

export async function saveOrder(order) {
  const data = await api.post('/orders', order);
  emitOrdersChange();
  return data.order;
}

export async function updateOrderStatus(id, status) {
  const data = await api.patch(`/orders/${id}/status`, { status });
  emitOrdersChange();
  return data.order;
}

export function getOrderEventName() {
  return ORDER_EVENT;
}
