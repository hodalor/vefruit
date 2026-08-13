import { useMemo, useState } from 'react';
import BuyerPortalLayout from '../components/BuyerPortalLayout';
import BuyerOrderDetailModal from '../components/BuyerOrderDetailModal';
import BuyerDataTable from '../components/BuyerDataTable';
import { useUserAuth } from '../auth/UserAuthContext';
import useBuyerOrders from '../buyer/useBuyerOrders';
import { buildPurchaseHistoryRows, formatDateTime, formatMoney } from '../buyer/buyerData';
import useProducts from '../products/useProducts';

function BuyerPurchaseHistory() {
  const { current } = useUserAuth();
  const orders = useBuyerOrders(current?.id);
  const products = useProducts();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const productsMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const rows = useMemo(() => buildPurchaseHistoryRows(orders, productsMap), [orders, productsMap]);

  const columns = [
    { key: 'productName', label: 'Product' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'amount', label: 'Amount', render: (row) => formatMoney(row.amount) },
    { key: 'createdAt', label: 'Purchased On', render: (row) => formatDateTime(row.createdAt) },
    { key: 'orderId', label: 'Order', render: (row) => `#${row.order?.id || 'N/A'}` },
  ];

  return (
    <BuyerPortalLayout
      title="Purchase History"
      subtitle="Every item you have purchased, organized in a clickable table."
      sidebarNote={`${rows.length} purchased item${rows.length === 1 ? '' : 's'}`}
    >
      <div className="Card">
        <div className="CardBody">
          <div className="AdminSectionHeader">
            <div>
              <h3 style={{ margin: 0 }}>Purchased Items</h3>
              <p className="AdminSubtle">Click any row to see the complete order behind that purchase.</p>
            </div>
          </div>
          <BuyerDataTable
            columns={columns}
            rows={rows}
            emptyMessage="No purchase history yet."
            onRowClick={(row) => setSelectedOrder(row.order)}
          />
        </div>
      </div>

      <BuyerOrderDetailModal order={selectedOrder} productsMap={productsMap} onClose={() => setSelectedOrder(null)} />
    </BuyerPortalLayout>
  );
}

export default BuyerPurchaseHistory;
