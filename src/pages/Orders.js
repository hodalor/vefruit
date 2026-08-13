import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getOrderEventName, loadOrders, updateOrderStatus } from '../orders/orderService';
import useProducts from '../products/useProducts';
import { useUserAuth } from '../auth/UserAuthContext';
import LoadingButton from '../components/LoadingButton';
import { useToast } from '../toast/ToastContext';

function Orders() {
  const { current } = useUserAuth();
  const { showToast } = useToast();
  const products = useProducts();
  const [orders, setOrders] = useState([]);
  const [updatingId, setUpdatingId] = useState(null);
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
    if (updatingId === id) return;
    setUpdatingId(id);
    try {
      await updateOrderStatus(id, 'completed');
      showToast('Order marked as received.');
    } catch (err) {
      showToast(err.message || 'Unable to update order status.', { type: 'error' });
    } finally {
      setUpdatingId(null);
    }
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
                    {i.sellerId && (
                      <>
                        {' '}
                        <Link to={`/messages?otherUserId=${encodeURIComponent(i.sellerId)}&productId=${encodeURIComponent(i.productId || i.id)}&buyerId=${encodeURIComponent(o.buyerId)}&farmerId=${encodeURIComponent(i.sellerId)}`}>
                          Chat Farmer
                        </Link>
                      </>
                    )}
                  </li>
                ))}
              </ul>
              <div className="OrderTotal">
                <strong>Total:</strong> GHS { (
                  (o.totalAmount !== undefined ? o.totalAmount : (o.items || []).reduce((sum, i) => sum + (i.price || 0) * (i.quantity || i.qty || 0), 0))
                ).toFixed(2) } ({formatOrderStatusLabel(o.orderStatus || o.status || 'processing')})
              </div>
              <div className="AdminPillRow" style={{ marginTop: '0.65rem' }}>
                {buildOrderTimeline(o.orderStatus || o.status || 'processing').map((step) => (
                  <span key={step.label} className="AdminPill" style={{ background: step.active ? '#dcfce7' : '#e2e8f0', color: step.active ? '#166534' : '#475569' }}>
                    {step.label}
                  </span>
                ))}
              </div>
              {o.neededBy && <div className="Muted">Needed by: {o.neededBy}</div>}
              {o.requestNote && <div className="Muted">Request: {o.requestNote}</div>}
              {((o.orderStatus || o.status) === 'sent-for-delivery') && (
                <div style={{ marginTop: '0.5rem' }}>
                  <LoadingButton className="Btn" type="button" loading={updatingId === o.id} loadingText="Saving..." onClick={() => markDelivered(o.id)}>
                    Mark Received
                  </LoadingButton>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function formatOrderStatusLabel(status) {
  const current = String(status || '').replace(/-/g, ' ');
  return current ? `${current[0].toUpperCase()}${current.slice(1)}` : 'Processing';
}

function buildOrderTimeline(status) {
  const steps = ['processing', 'packaged', 'sent-for-delivery', 'completed'];
  const normalized = String(status || 'processing');
  const currentIndex = Math.max(0, steps.indexOf(normalized));
  return steps.map((step, index) => ({
    label: formatOrderStatusLabel(step),
    active: index <= currentIndex,
  }));
}

export default Orders;
