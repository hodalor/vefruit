import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getOrderEventName, loadOrders } from '../orders/orderService';
import useProducts from '../products/useProducts';
import { useUserAuth } from '../auth/UserAuthContext';

function BuyerDashboard() {
  const { current } = useUserAuth();
  const products = useProducts();
  const [orders, setOrders] = useState([]);
  const [spendTooltip, setSpendTooltip] = useState(null);
  const productsMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  useEffect(() => {
    if (!current?.id) {
      setOrders([]);
      return undefined;
    }

    const sync = () => loadOrders({ buyerId: current.id }).then(setOrders).catch(() => setOrders([]));
    sync();
    window.addEventListener(getOrderEventName(), sync);
    return () => window.removeEventListener(getOrderEventName(), sync);
  }, [current?.id]);

  const stats = useMemo(() => {
    const totalSpent = orders.reduce((sum, order) => sum + getOrderValue(order), 0);
    const paidOrders = orders.filter((order) => String(order.paymentStatus || '').toLowerCase() === 'paid').length;
    const completedOrders = orders.filter((order) => String(order.orderStatus || order.status || '').toLowerCase() === 'completed').length;
    const itemsPurchased = orders.reduce((sum, order) => sum + getOrderItems(order).reduce((inner, item) => inner + getItemQty(item), 0), 0);
    return {
      totalSpent,
      paidOrders,
      completedOrders,
      itemsPurchased,
    };
  }, [orders]);

  const spendSeries = useMemo(() => {
    const map = new Map();
    orders.forEach((order) => {
      const key = new Date(order.createdAt || order.placedAt || Date.now()).toISOString().slice(0, 10);
      map.set(key, (map.get(key) || 0) + getOrderValue(order));
    });
    const keys = Array.from(map.keys()).sort();
    const days = keys.slice(Math.max(0, keys.length - 7));
    const max = days.reduce((value, key) => Math.max(value, map.get(key) || 0), 0) || 1;
    return {
      max,
      points: days.map((key) => {
        const date = new Date(key);
        const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return {
          label: labels[date.getDay()],
          value: map.get(key) || 0,
        };
      }),
    };
  }, [orders]);

  const statusBreakdown = useMemo(() => {
    const map = new Map();
    let total = 0;
    orders.forEach((order) => {
      const status = formatOrderStatusLabel(order.orderStatus || order.status || 'processing');
      map.set(status, (map.get(status) || 0) + 1);
      total += 1;
    });
    return {
      total,
      entries: Array.from(map.entries()).map(([label, value]) => ({ label, value })),
    };
  }, [orders]);

  const paymentHistory = useMemo(() => {
    return orders
      .map((order) => ({
        id: order.id,
        reference: order.paystackReference || 'No reference',
        paymentStatus: String(order.paymentStatus || 'pending'),
        amount: getOrderValue(order),
        createdAt: order.createdAt || order.placedAt,
      }))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [orders]);

  const recentOrders = useMemo(() => orders.slice(0, 4), [orders]);

  return (
    <main className="Container">
      <div className="AdminHeading" style={{ marginBottom: '1rem' }}>
        <div>
          <h1>Buyer Dashboard</h1>
          <p className="AdminSubtle">Track your orders, purchase history, payment history, and buying activity from one place.</p>
        </div>
      </div>

      <div className="StatGrid">
        <div className="StatCard">
          <div className="StatLabel">Total Orders</div>
          <div className="StatValue">{orders.length}</div>
        </div>
        <div className="StatCard">
          <div className="StatLabel">Total Spent</div>
          <div className="StatValue">GHS {stats.totalSpent.toFixed(2)}</div>
        </div>
        <div className="StatCard">
          <div className="StatLabel">Paid Orders</div>
          <div className="StatValue">{stats.paidOrders}</div>
        </div>
        <div className="StatCard">
          <div className="StatLabel">Completed</div>
          <div className="StatValue">{stats.completedOrders}</div>
        </div>
        <div className="StatCard">
          <div className="StatLabel">Items Purchased</div>
          <div className="StatValue">{stats.itemsPurchased}</div>
        </div>
      </div>

      <div className="BuyerDashboardGrid" style={{ marginTop: '1rem' }}>
        <div className="Card">
          <div className="CardBody">
            <div className="AdminSectionHeader">
              <div>
                <h3 style={{ marginTop: 0, marginBottom: '0.2rem' }}>Spend (Last 7 Days)</h3>
                <p className="AdminSubtle">How much you have spent recently.</p>
              </div>
              <Link to="/orders">View all orders</Link>
            </div>
            {spendSeries.points.length === 0 ? (
              <p className="Muted">No recent spending yet.</p>
            ) : (
              <div className="Chart" style={{ position: 'relative' }}>
                {renderLineChart(spendSeries, setSpendTooltip)}
                {spendTooltip && (
                  <div className="Tooltip" style={{ left: `${spendTooltip.leftPct}%`, top: `${spendTooltip.topPct}%` }}>
                    <div className="TooltipInner">
                      <div>{spendTooltip.label}</div>
                      <div>GHS {spendTooltip.value.toFixed(2)}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="Card">
          <div className="CardBody">
            <h3 style={{ marginTop: 0, marginBottom: '0.2rem' }}>Order Status Breakdown</h3>
            <p className="AdminSubtle">See where your purchases currently stand.</p>
            {statusBreakdown.entries.length === 0 ? (
              <p className="Muted">No orders yet.</p>
            ) : (
              <StatusDonut breakdown={statusBreakdown} />
            )}
          </div>
        </div>
      </div>

      <div className="BuyerDashboardGrid" style={{ marginTop: '1rem' }}>
        <div className="Card">
          <div className="CardBody">
            <div className="AdminSectionHeader">
              <div>
                <h3 style={{ marginTop: 0, marginBottom: '0.2rem' }}>Purchase History</h3>
                <p className="AdminSubtle">Your latest orders and what you bought.</p>
              </div>
              <Link to="/orders">Open full order history</Link>
            </div>
            {recentOrders.length === 0 ? (
              <p className="Muted">No purchases yet.</p>
            ) : (
              <div className="BuyerHistoryGrid">
                {recentOrders.map((order) => (
                  <div className="Card" key={order.id}>
                    <div className="CardBody">
                      <strong>Order #{String(order.id).slice(-8)}</strong>
                      <div className="Muted">{new Date(order.createdAt || order.placedAt || Date.now()).toLocaleString()}</div>
                      <div className="AdminPillRow">
                        <span className="AdminPill">{formatOrderStatusLabel(order.orderStatus || order.status || 'processing')}</span>
                        <span className="AdminPill">{String(order.paymentStatus || 'pending')}</span>
                      </div>
                      <div className="AdminDetailList">
                        {getOrderItems(order).map((item) => (
                          <div key={`${order.id}-${item.productId || item.id}`}>
                            <strong>{productsMap.get(item.productId || item.id)?.name || `Item ${item.productId || item.id}`}</strong> x {getItemQty(item)}
                          </div>
                        ))}
                      </div>
                      <div className="Muted">Total: GHS {getOrderValue(order).toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="Card">
          <div className="CardBody">
            <h3 style={{ marginTop: 0, marginBottom: '0.2rem' }}>Payment History</h3>
            <p className="AdminSubtle">References and payment outcomes for your orders.</p>
            {paymentHistory.length === 0 ? (
              <p className="Muted">No payment history yet.</p>
            ) : (
              <div className="BuyerPaymentList">
                {paymentHistory.map((payment) => (
                  <div className="BuyerPaymentRow" key={payment.id}>
                    <div>
                      <strong>{payment.reference}</strong>
                      <div className="Muted">{new Date(payment.createdAt || Date.now()).toLocaleString()}</div>
                    </div>
                    <div className="BuyerPaymentMeta">
                      <span className="AdminPill">{payment.paymentStatus}</span>
                      <strong>GHS {payment.amount.toFixed(2)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function renderLineChart(series, setTooltip) {
  const width = 600;
  const height = 160;
  const pad = 12;
  const max = series.max || 1;
  const count = series.points.length;
  const xs = series.points.map((_, index) => (count > 1 ? (index / (count - 1)) : 0) * (width - 2 * pad) + pad);
  const ys = series.points.map((point) => height - pad - (point.value / max) * (height - 2 * pad));
  const linePoints = xs.map((x, index) => `${Math.round(x)},${Math.round(ys[index])}`).join(' ');
  const areaPoints = [`${pad},${height - pad}`, linePoints, `${width - pad},${height - pad}`].join(' ');

  return (
    <>
      <svg className="ChartSvg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <polyline points={areaPoints} className="ChartArea" />
        <polyline points={linePoints} className="ChartLine" />
        {xs.map((x, index) => (
          <circle
            key={`${series.points[index].label}-${index}`}
            cx={x}
            cy={ys[index]}
            r={2.5}
            className="ChartDot"
            onMouseEnter={() => setTooltip({
              label: series.points[index].label,
              value: series.points[index].value,
              leftPct: (x / width) * 100,
              topPct: (ys[index] / height) * 100,
            })}
            onMouseLeave={() => setTooltip(null)}
          />
        ))}
      </svg>
      <div className="ChartAxis">
        {series.points.map((point, index) => (
          <div className="AxisTick" key={`${point.label}-${index}`}>
            <span className="AxisLabel">{point.label}</span>
            <span className="AxisValue">GHS {point.value.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function StatusDonut({ breakdown }) {
  const width = 240;
  const height = 240;
  const cx = width / 2;
  const cy = height / 2;
  const radius = 90;
  const palette = ['#16a34a', '#2563eb', '#f59e0b', '#8b5cf6', '#ef4444', '#22c55e'];
  let start = -Math.PI / 2;
  const slices = breakdown.entries.map((entry, index) => {
    const angle = (entry.value / Math.max(breakdown.total, 1)) * Math.PI * 2;
    const end = start + angle;
    const x0 = cx + radius * Math.cos(start);
    const y0 = cy + radius * Math.sin(start);
    const x1 = cx + radius * Math.cos(end);
    const y1 = cy + radius * Math.sin(end);
    const largeArc = angle > Math.PI ? 1 : 0;
    const path = `M ${cx},${cy} L ${x0},${y0} A ${radius},${radius} 0 ${largeArc} 1 ${x1},${y1} Z`;
    const slice = { ...entry, path, color: palette[index % palette.length] };
    start = end;
    return slice;
  });

  return (
    <div className="Chart" style={{ display: 'grid', gap: '0.75rem', justifyItems: 'center' }}>
      <svg className="PieSvg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        {slices.map((slice) => (
          <path key={slice.label} d={slice.path} style={{ fill: slice.color }} />
        ))}
        <circle cx={cx} cy={cy} r="50" style={{ fill: '#fff' }} />
        <text x={cx} y={cy - 4} textAnchor="middle" className="AdminDonutValue">{breakdown.total}</text>
        <text x={cx} y={cy + 16} textAnchor="middle" className="AdminDonutLabel">Orders</text>
      </svg>
      <div className="Legend">
        {slices.map((slice) => (
          <div className="LegendItem" key={slice.label}>
            <span className="LegendSwatch" style={{ background: slice.color }} />
            <span>{slice.label}</span>
            <strong>{slice.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function getOrderItems(order) {
  return Array.isArray(order.items) ? order.items : [];
}

function getItemQty(item) {
  return Number(item.quantity || item.qty || 0);
}

function getOrderValue(order) {
  if (order.totalAmount !== undefined) return Number(order.totalAmount) || 0;
  return getOrderItems(order).reduce((sum, item) => sum + (Number(item.price) || 0) * getItemQty(item), 0);
}

function formatOrderStatusLabel(status) {
  const current = String(status || '').replace(/-/g, ' ');
  return current ? `${current[0].toUpperCase()}${current.slice(1)}` : 'Processing';
}

export default BuyerDashboard;
