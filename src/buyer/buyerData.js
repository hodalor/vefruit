export function getOrderItems(order) {
  return Array.isArray(order?.items) ? order.items : [];
}

export function getItemQty(item) {
  return Number(item?.quantity || item?.qty || 0);
}

export function getOrderValue(order) {
  if (order?.totalAmount !== undefined) return Number(order.totalAmount) || 0;
  return getOrderItems(order).reduce((sum, item) => sum + (Number(item.price) || 0) * getItemQty(item), 0);
}

export function formatMoney(value) {
  return `GHS ${Number(value || 0).toFixed(2)}`;
}

export function formatDateTime(value) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleString();
}

export function formatOrderStatusLabel(status) {
  const current = String(status || '').replace(/-/g, ' ');
  return current ? `${current[0].toUpperCase()}${current.slice(1)}` : 'Processing';
}

export function buildOrderTimeline(status) {
  const steps = ['processing', 'packaged', 'sent-for-delivery', 'completed'];
  const normalized = String(status || 'processing');
  const currentIndex = Math.max(0, steps.indexOf(normalized));
  return steps.map((step, index) => ({
    label: formatOrderStatusLabel(step),
    active: index <= currentIndex,
  }));
}

export function buildPaymentHistory(orders = []) {
  return orders
    .map((order) => ({
      id: order.id,
      order,
      reference: order.paystackReference || 'No reference',
      paymentStatus: String(order.paymentStatus || 'pending'),
      amount: getOrderValue(order),
      createdAt: order.createdAt || order.placedAt,
    }))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

export function buildPurchaseHistoryRows(orders = [], productsMap = new Map()) {
  return orders.flatMap((order) => (
    getOrderItems(order).map((item) => ({
      id: `${order.id}-${item.productId || item.id}`,
      order,
      item,
      productName: productsMap.get(item.productId || item.id)?.name || `Item ${item.productId || item.id}`,
      quantity: getItemQty(item),
      amount: (Number(item.price) || 0) * getItemQty(item),
      createdAt: order.createdAt || order.placedAt,
    }))
  )).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}
