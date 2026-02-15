import { useNavigate } from 'react-router-dom';
import { useCart } from '../cart/CartContext';
import { saveOrder } from '../orders/orderService';
import { loadProducts, updateProduct } from '../products/productService';
import { useUserAuth } from '../auth/UserAuthContext';

function Checkout() {
  const { items, total, clearCart } = useCart();
  const navigate = useNavigate();
  const { current } = useUserAuth();

  const handlePay = () => {
    if (!current) {
      navigate('/login');
      return;
    }
    const order = {
      buyerId: current.id,
      items: items.map((i) => ({ productId: i.id, quantity: i.qty, price: i.price })),
      totalAmount: total,
      paymentStatus: 'paid',
      orderStatus: 'processing',
      createdAt: new Date().toISOString(),
    };
    const list = loadProducts();
    order.items.forEach((i) => {
      const p = list.find((x) => x.id === i.productId);
      const inv = Number(p?.inventory ?? p?.quantity ?? 0);
      const next = Math.max(0, inv - i.quantity);
      if (p) updateProduct(p.id, { inventory: next, quantity: next });
    });
    saveOrder(order);
    clearCart();
    navigate('/orders');
  };

  return (
    <main className="Container">
      <h2>Checkout</h2>
      {items.length === 0 ? (
        <p>No items to checkout.</p>
      ) : (
        <div className="Checkout">
          <ul>
            {items.map((i) => (
              <li key={i.id}>{i.name} × {i.qty} — GHS { (i.price * i.qty).toFixed(2) }</li>
            ))}
          </ul>
          <p><strong>Total:</strong> GHS {total.toFixed(2)}</p>
          <button className="Btn" onClick={handlePay}>Pay (Test Mode)</button>
        </div>
      )}
    </main>
  );
}

export default Checkout;
