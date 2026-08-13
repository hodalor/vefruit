import { useMemo, useState } from 'react';
import LoadingButton from '../components/LoadingButton';
import BuyerPortalLayout from '../components/BuyerPortalLayout';
import BuyerOrderDetailModal from '../components/BuyerOrderDetailModal';
import BuyerDataTable from '../components/BuyerDataTable';
import { useUserAuth } from '../auth/UserAuthContext';
import { useToast } from '../toast/ToastContext';
import useBuyerOrders from '../buyer/useBuyerOrders';
import {
  formatDateTime,
  formatMoney,
  formatOrderStatusLabel,
  getOrderValue,
} from '../buyer/buyerData';
import { updateOrderStatus } from '../orders/orderService';
import useProducts from '../products/useProducts';

function BuyerOrders() {
  const { current } = useUserAuth();
  const { showToast } = useToast();
  const orders = useBuyerOrders(current?.id);
  const products = useProducts();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingId, setUpdatingId] = useState('');
  const productsMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  const markReceived = async (event, orderId) => {
    event.stopPropagation();
    if (!orderId || updatingId === orderId) return;
    setUpdatingId(orderId);
    try {
      await updateOrderStatus(orderId, 'completed');
      showToast('Order marked as received.');
    } catch (error) {
      showToast(error.message || 'Unable to update the order.', { type: 'error' });
    } finally {
      setUpdatingId('');
    }
  };

  const columns = [
    { key: 'id', label: 'Order ID', render: (row) => `#${row.id}` },
    { key: 'createdAt', label: 'Placed', render: (row) => formatDateTime(row.createdAt || row.placedAt) },
    { key: 'total', label: 'Amount', render: (row) => formatMoney(getOrderValue(row)) },
    { key: 'paymentStatus', label: 'Payment', render: (row) => formatOrderStatusLabel(row.paymentStatus || 'pending') },
    { key: 'status', label: 'Order Status', render: (row) => formatOrderStatusLabel(row.orderStatus || row.status || 'processing') },
    {
      key: 'action',
      label: 'Action',
      render: (row) => (
        String(row.orderStatus || row.status || '') === 'sent-for-delivery' ? (
          <LoadingButton
            type="button"
            className="Btn"
            loading={updatingId === row.id}
            loadingText="Saving..."
            onClick={(event) => markReceived(event, row.id)}
          >
            Mark Received
          </LoadingButton>
        ) : (
          <span className="Muted">Click row for details</span>
        )
      ),
    },
  ];

  return (
    <BuyerPortalLayout
      title="Orders"
      subtitle="All your buyer orders in one clickable table."
      sidebarNote={`${orders.length} total order${orders.length === 1 ? '' : 's'}`}
    >
      <div className="Card">
        <div className="CardBody">
          <div className="AdminSectionHeader">
            <div>
              <h3 style={{ margin: 0 }}>Order List</h3>
              <p className="AdminSubtle">Open any row to see the full order, products, delivery note, and farmer chat links.</p>
            </div>
          </div>
          <BuyerDataTable
            columns={columns}
            rows={orders}
            emptyMessage="No orders yet."
            onRowClick={setSelectedOrder}
          />
        </div>
      </div>

      <BuyerOrderDetailModal order={selectedOrder} productsMap={productsMap} onClose={() => setSelectedOrder(null)} />
    </BuyerPortalLayout>
  );
}

export default BuyerOrders;
