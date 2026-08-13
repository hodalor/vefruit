import { useMemo, useState } from 'react';
import BuyerPortalLayout from '../components/BuyerPortalLayout';
import BuyerOrderDetailModal from '../components/BuyerOrderDetailModal';
import BuyerDataTable from '../components/BuyerDataTable';
import { useUserAuth } from '../auth/UserAuthContext';
import useBuyerOrders from '../buyer/useBuyerOrders';
import { buildPaymentHistory, formatDateTime, formatMoney, formatOrderStatusLabel } from '../buyer/buyerData';
import useProducts from '../products/useProducts';

function BuyerPayments() {
  const { current } = useUserAuth();
  const orders = useBuyerOrders(current?.id);
  const products = useProducts();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const productsMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const payments = useMemo(() => buildPaymentHistory(orders), [orders]);

  const columns = [
    { key: 'reference', label: 'Reference' },
    { key: 'createdAt', label: 'Date', render: (row) => formatDateTime(row.createdAt) },
    { key: 'amount', label: 'Amount', render: (row) => formatMoney(row.amount) },
    { key: 'paymentStatus', label: 'Payment Status', render: (row) => formatOrderStatusLabel(row.paymentStatus) },
    { key: 'orderId', label: 'Order', render: (row) => `#${row.order?.id || 'N/A'}` },
  ];

  return (
    <BuyerPortalLayout
      title="Payments"
      subtitle="A complete list of your payments with direct access to each linked order."
      sidebarNote={`${payments.length} payment record${payments.length === 1 ? '' : 's'}`}
    >
      <div className="Card">
        <div className="CardBody">
          <div className="AdminSectionHeader">
            <div>
              <h3 style={{ margin: 0 }}>Payment History</h3>
              <p className="AdminSubtle">Click any payment row to open the related order details.</p>
            </div>
          </div>
          <BuyerDataTable
            columns={columns}
            rows={payments}
            emptyMessage="No payments yet."
            onRowClick={(row) => setSelectedOrder(row.order)}
          />
        </div>
      </div>

      <BuyerOrderDetailModal order={selectedOrder} productsMap={productsMap} onClose={() => setSelectedOrder(null)} />
    </BuyerPortalLayout>
  );
}

export default BuyerPayments;
