import { useEffect, useMemo, useState } from 'react';
import { getOrderEventName, loadOrders, updateOrderStatus } from '../orders/orderService';
import useProducts from '../products/useProducts';
import { useUserAuth } from '../auth/UserAuthContext';

function Orders() {
  const { current } = useUserAuth();
  const products = useProducts();
  const [orders, setOrders] = useState([]);
  const productsMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  useEffect(() => {
    if (!current?.id) {
      setOrders([]);
      return undefined;
    }

    const sync = () => loadOrders({ buyerId: current.id }).then(setOrders).catch(() => setOrders([]));
    sync();
    window.addEventListener(getOrderEventName(), sync);
    return () => {
      window.removeEventListener(getOrderEventName(), sync);
    };
  }, [current?.id]);

  const markDelivered = async (id) => {
    await updateOrderStatus(id, 'completed');
  };
  return (
    <main className="Container">
      <h2>Order History</h2>
      {!current ? (
        <p>Please login to view your orders.</p>
      ) : orders.length === 0 ? (
        <p>No orders yet.</p>
      ) : (
        <div className="Orders">
          {orders.map((o) => (
            <div className="OrderCard" key={o.id}>
              <div className="OrderHeader">
                <strong>Order #{o.id}</strong>
                <span>{new Date(o.createdAt || o.placedAt).toLocaleString()}</span>
              </div>
              <ul>
                {o.items.map((i) => (
                  <li key={`${i.productId || i.id}`}>
                    {(productsMap.get(i.productId || i.id)?.name) || `Item #${i.productId || i.id}`}
                    
                    × {i.quantity || i.qty} — GHS { ((i.price || 0) * (i.quantity || i.qty || 0)).toFixed(2) }
                  </li>
                ))}
              </ul>
              <div className="OrderTotal">
                <strong>Total:</strong> GHS { (
                  (o.totalAmount !== undefined ? o.totalAmount : (o.items || []).reduce((sum, i) => sum + (i.price || 0) * (i.quantity || i.qty || 0), 0))
                ).toFixed(2) } ({o.orderStatus || o.status || 'processing'})
              </div>
              {o.neededBy && <div className="Muted">Needed by: {o.neededBy}</div>}
              {o.requestNote && <div className="Muted">Request: {o.requestNote}</div>}
              {((o.orderStatus || o.status) === 'shipped') && (
                <div style={{ marginTop: '0.5rem' }}>
                  <button className="Btn" onClick={() => markDelivered(o.id)}>Mark Delivered</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

export default Orders;
