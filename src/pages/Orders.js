import { useMemo, useState } from 'react';
import { loadOrders, updateOrderStatus } from '../orders/orderService';
import { loadProducts } from '../products/productService';

function Orders() {
  const [orders, setOrders] = useState(() => loadOrders());
  const productsMap = useMemo(() => new Map(loadProducts().map((p) => [p.id, p])), [orders]);
  const refresh = () => setOrders(loadOrders());
  return (
    <main className="Container">
      <h2>Order History</h2>
      {orders.length === 0 ? (
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
              {((o.orderStatus || o.status) === 'shipped') && (
                <div style={{ marginTop: '0.5rem' }}>
                  <button className="Btn" onClick={() => { updateOrderStatus(o.id, 'completed'); refresh(); }}>Mark Delivered</button>
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
