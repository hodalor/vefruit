import { useEffect, useState } from 'react';
import { getOrderEventName, loadOrders } from '../orders/orderService';

function sortOrders(items = []) {
  return [...items].sort((a, b) => new Date(b.createdAt || b.placedAt || 0) - new Date(a.createdAt || a.placedAt || 0));
}

export default function useBuyerOrders(buyerId) {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (!buyerId) {
      setOrders([]);
      return undefined;
    }

    const sync = () => loadOrders({ buyerId }).then((items) => setOrders(sortOrders(items))).catch(() => setOrders([]));
    sync();
    window.addEventListener(getOrderEventName(), sync);
    return () => window.removeEventListener(getOrderEventName(), sync);
  }, [buyerId]);

  return orders;
}
