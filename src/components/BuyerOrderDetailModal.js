import { Link } from 'react-router-dom';
import { buildOrderTimeline, formatOrderStatusLabel, getItemQty, getOrderItems, getOrderValue } from '../buyer/buyerData';

function BuyerOrderDetailModal({ order, productsMap, onClose }) {
  if (!order) return null;

  return (
    <div className="EditOverlay">
      <div className="EditModal Card AdminModalMedium OrderDetailModal">
        <div className="CardBody">
          <div className="AdminSectionHeader">
            <div>
              <h3 style={{ marginTop: 0, marginBottom: '0.2rem' }}>Order #{order.id}</h3>
              <p className="AdminSubtle">Full order details including products, payment, delivery note, and farmer chat links.</p>
            </div>
            <button className="BtnOutline" type="button" onClick={onClose}>Close</button>
          </div>

          <div className="AdminPillRow">
            <span className="AdminPill">{formatOrderStatusLabel(order.orderStatus || order.status || 'processing')}</span>
            <span className="AdminPill">{String(order.paymentStatus || 'pending')}</span>
            <span className="AdminPill">GHS {getOrderValue(order).toFixed(2)}</span>
          </div>

          <div className="AdminPillRow" style={{ marginTop: '0.75rem' }}>
            {buildOrderTimeline(order.orderStatus || order.status || 'processing').map((step) => (
              <span key={step.label} className="AdminPill" style={{ background: step.active ? '#dcfce7' : '#e2e8f0', color: step.active ? '#166534' : '#475569' }}>
                {step.label}
              </span>
            ))}
          </div>

          <div className="FarmerDetailGrid" style={{ marginTop: '1rem' }}>
            <InfoRow label="Placed At" value={new Date(order.createdAt || order.placedAt || Date.now()).toLocaleString()} />
            <InfoRow label="Needed By" value={order.neededBy || 'Not specified'} />
            <InfoRow label="Payment Reference" value={order.paystackReference || 'Not available'} />
            <InfoRow label="Request Note" value={order.requestNote || 'No delivery note'} />
          </div>

          <div className="AdminButtonRow" style={{ marginTop: '1rem' }}>
            {order.buyerId ? (
              <Link className="BtnOutline" to={`/profiles/buyer/${encodeURIComponent(order.buyerId)}`}>
                View Buyer Profile
              </Link>
            ) : null}
          </div>

          <div className="AdminSectionHeader" style={{ marginTop: '1rem' }}>
            <div>
              <h4 style={{ margin: 0 }}>Products</h4>
              <p className="AdminSubtle">Ordered items and direct farmer chat links.</p>
            </div>
          </div>

          <div className="BuyerDetailList">
            {getOrderItems(order).map((item) => (
              <div className="BuyerDetailRow" key={`${order.id}-${item.productId || item.id}`}>
                <div>
                  <strong>{productsMap.get(item.productId || item.id)?.name || `Item ${item.productId || item.id}`}</strong>
                  <div className="Muted">Qty: {getItemQty(item)} | Unit Price: GHS {(Number(item.price) || 0).toFixed(2)}</div>
                </div>
                <div className="AdminButtonRow">
                  {item.productId ? (
                    <Link className="BtnOutline" to={`/product/${encodeURIComponent(item.productId || item.id)}`}>
                      Open Product
                    </Link>
                  ) : null}
                  {item.sellerId ? (
                    <Link className="BtnOutline" to={`/profiles/farmer/${encodeURIComponent(item.sellerId)}`}>
                      View Farmer Profile
                    </Link>
                  ) : null}
                  {item.sellerId ? (
                    <Link to={`/messages?otherUserId=${encodeURIComponent(item.sellerId)}&productId=${encodeURIComponent(item.productId || item.id)}&buyerId=${encodeURIComponent(order.buyerId)}&farmerId=${encodeURIComponent(item.sellerId)}`}>
                      Chat Farmer
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="Card" style={{ borderRadius: '16px' }}>
      <div className="CardBody">
        <div className="Muted">{label}</div>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

export default BuyerOrderDetailModal;
