import { useMemo, useState } from 'react';
import BuyerPortalLayout from '../components/BuyerPortalLayout';
import BuyerOrderDetailModal from '../components/BuyerOrderDetailModal';
import BuyerDataTable from '../components/BuyerDataTable';
import { useUserAuth } from '../auth/UserAuthContext';
import useBuyerOrders from '../buyer/useBuyerOrders';
import useProducts from '../products/useProducts';
import {
  buildPaymentHistory,
  buildPurchaseHistoryRows,
  formatDateTime,
  formatMoney,
  formatOrderStatusLabel,
  getOrderItems,
  getOrderValue,
} from '../buyer/buyerData';

function BuyerDashboard() {
  const { current } = useUserAuth();
  const orders = useBuyerOrders(current?.id);
  const products = useProducts();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const productsMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  const payments = useMemo(() => buildPaymentHistory(orders), [orders]);
  const purchases = useMemo(() => buildPurchaseHistoryRows(orders, productsMap), [orders, productsMap]);

  const stats = useMemo(() => {
    const totalSpent = orders.reduce((sum, order) => sum + getOrderValue(order), 0);
    const completedOrders = orders.filter((order) => String(order.orderStatus || order.status || '').toLowerCase() === 'completed').length;
    const paidPayments = payments.filter((payment) => payment.paymentStatus === 'paid').length;
    const totalItems = orders.reduce((sum, order) => sum + getOrderItems(order).reduce((inner, item) => inner + Number(item.quantity || item.qty || 0), 0), 0);
    return [
      { label: 'Total Orders', value: orders.length },
      { label: 'Total Spent', value: formatMoney(totalSpent) },
      { label: 'Paid Payments', value: paidPayments },
      { label: 'Items Purchased', value: totalItems },
      { label: 'Completed Orders', value: completedOrders },
    ];
  }, [orders, payments]);

  const spendSeries = useMemo(() => buildSpendSeries(orders), [orders]);
  const statusBreakdown = useMemo(() => buildStatusBreakdown(orders), [orders]);

  const orderColumns = [
    { key: 'id', label: 'Order ID', render: (row) => `#${row.id}` },
    { key: 'createdAt', label: 'Placed', render: (row) => formatDateTime(row.createdAt || row.placedAt) },
    { key: 'total', label: 'Amount', render: (row) => formatMoney(getOrderValue(row)) },
    { key: 'status', label: 'Status', render: (row) => formatOrderStatusLabel(row.orderStatus || row.status || 'processing') },
  ];

  const paymentColumns = [
    { key: 'reference', label: 'Reference' },
    { key: 'createdAt', label: 'Date', render: (row) => formatDateTime(row.createdAt) },
    { key: 'amount', label: 'Amount', render: (row) => formatMoney(row.amount) },
    { key: 'paymentStatus', label: 'Status', render: (row) => formatOrderStatusLabel(row.paymentStatus) },
  ];

  const purchaseColumns = [
    { key: 'productName', label: 'Product' },
    { key: 'quantity', label: 'Qty' },
    { key: 'amount', label: 'Amount', render: (row) => formatMoney(row.amount) },
    { key: 'createdAt', label: 'Purchased', render: (row) => formatDateTime(row.createdAt) },
  ];

  return (
    <BuyerPortalLayout
      title="Dashboard"
      subtitle="A quick summary of your buyer activity, payments, orders, and purchase flow."
      sidebarNote={`Logged in as ${current?.name || 'Buyer'}`}
    >
      <section className="AdminStack">
        <div className="StatGrid">
          {stats.map((stat) => (
            <div className="StatCard" key={stat.label}>
              <div className="StatLabel">{stat.label}</div>
              <div className="StatValue">{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="BuyerDashboardGrid">
          <div className="Card">
            <div className="CardBody">
              <div className="AdminSectionHeader">
                <div>
                  <h3 style={{ margin: 0 }}>Spending Trend</h3>
                  <p className="AdminSubtle">Your recent order value over time.</p>
                </div>
              </div>
              <SpendChart series={spendSeries} />
            </div>
          </div>

          <div className="Card">
            <div className="CardBody">
              <div className="AdminSectionHeader">
                <div>
                  <h3 style={{ margin: 0 }}>Order Status</h3>
                  <p className="AdminSubtle">How your orders are moving right now.</p>
                </div>
              </div>
              <StatusDonut rows={statusBreakdown} />
            </div>
          </div>
        </div>

        <div className="Card">
          <div className="CardBody">
            <div className="AdminSectionHeader">
              <div>
                <h3 style={{ margin: 0 }}>Recent Orders</h3>
                <p className="AdminSubtle">Click any row to open the full order details.</p>
              </div>
            </div>
            <BuyerDataTable
              columns={orderColumns}
              rows={orders.slice(0, 5)}
              emptyMessage="No orders yet."
              onRowClick={setSelectedOrder}
            />
          </div>
        </div>

        <div className="BuyerDashboardGrid">
          <div className="Card">
            <div className="CardBody">
              <div className="AdminSectionHeader">
                <div>
                  <h3 style={{ margin: 0 }}>Recent Payments</h3>
                  <p className="AdminSubtle">Latest payment records from your orders.</p>
                </div>
              </div>
              <BuyerDataTable
                columns={paymentColumns}
                rows={payments.slice(0, 5)}
                emptyMessage="No payments recorded yet."
                onRowClick={(row) => setSelectedOrder(row.order)}
              />
            </div>
          </div>

          <div className="Card">
            <div className="CardBody">
              <div className="AdminSectionHeader">
                <div>
                  <h3 style={{ margin: 0 }}>Recent Purchase History</h3>
                  <p className="AdminSubtle">A quick view of the products you bought.</p>
                </div>
              </div>
              <BuyerDataTable
                columns={purchaseColumns}
                rows={purchases.slice(0, 5)}
                emptyMessage="No purchase history yet."
                onRowClick={(row) => setSelectedOrder(row.order)}
              />
            </div>
          </div>
        </div>
      </section>

      <BuyerOrderDetailModal order={selectedOrder} productsMap={productsMap} onClose={() => setSelectedOrder(null)} />
    </BuyerPortalLayout>
  );
}

function buildSpendSeries(orders = []) {
  const grouped = new Map();
  orders.forEach((order) => {
    const date = new Date(order.createdAt || order.placedAt || Date.now());
    const key = Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    grouped.set(key, (grouped.get(key) || 0) + getOrderValue(order));
  });

  const entries = Array.from(grouped.entries()).slice(-7);
  if (entries.length === 0) {
    return [{ label: 'No data', value: 0 }];
  }

  return entries.map(([label, value]) => ({ label, value }));
}

function buildStatusBreakdown(orders = []) {
  const counts = new Map();
  orders.forEach((order) => {
    const label = formatOrderStatusLabel(order.orderStatus || order.status || 'processing');
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  if (counts.size === 0) {
    return [{ label: 'No orders', value: 1, color: '#cbd5e1' }];
  }

  const colors = ['#16a34a', '#2563eb', '#f59e0b', '#8b5cf6', '#ec4899'];
  return Array.from(counts.entries()).map(([label, value], index) => ({
    label,
    value,
    color: colors[index % colors.length],
  }));
}

function SpendChart({ series = [] }) {
  const width = 560;
  const height = 180;
  const max = Math.max(...series.map((point) => point.value), 1);
  const stepX = series.length > 1 ? width / (series.length - 1) : width / 2;
  const points = series.map((point, index) => {
    const x = series.length > 1 ? index * stepX : width / 2;
    const y = height - ((point.value / max) * (height - 24)) - 12;
    return { ...point, x, y };
  });
  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`
    : '';

  return (
    <div className="Chart">
      <svg className="ChartSvg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Spending chart">
        {areaPath ? <path className="ChartArea" d={areaPath} /> : null}
        {linePath ? <path className="ChartLine" d={linePath} /> : null}
        {points.map((point) => (
          <circle className="ChartDot" key={point.label} cx={point.x} cy={point.y} r="4" />
        ))}
      </svg>
      <div className="ChartAxis">
        {series.map((point) => (
          <div className="AxisTick" key={point.label}>
            <div className="AxisLabel">{point.label}</div>
            <div className="AxisValue">{formatMoney(point.value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusDonut({ rows = [] }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const circumference = 2 * Math.PI * 52;
  let offset = 0;

  return (
    <div className="AdminDonutWrap">
      <svg className="PieSvg" viewBox="0 0 180 180" role="img" aria-label="Order status donut">
        <g transform="translate(90 90) rotate(-90)">
          {rows.map((row) => {
            const ratio = total > 0 ? row.value / total : 0;
            const dash = ratio * circumference;
            const circle = (
              <circle
                key={row.label}
                r="52"
                cx="0"
                cy="0"
                fill="none"
                stroke={row.color}
                strokeWidth="18"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
              />
            );
            offset += dash;
            return circle;
          })}
        </g>
        <text x="90" y="82" textAnchor="middle" className="AdminDonutValue">{total}</text>
        <text x="90" y="102" textAnchor="middle" className="AdminDonutLabel">Orders</text>
      </svg>

      <div className="Legend">
        {rows.map((row) => (
          <div className="LegendItem" key={row.label}>
            <span className="LegendSwatch" style={{ background: row.color }} />
            <span>{row.label}</span>
            <strong>{row.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BuyerDashboard;
