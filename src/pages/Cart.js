import { useCart } from '../cart/CartContext';
import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { loadProducts } from '../products/productService';

function Cart() {
  const { items, updateQty, removeItem, total } = useCart();
  const productsMap = useMemo(() => new Map(loadProducts().map((p) => [p.id, p])), []);
  return (
    <main className="Container">
      <h2>Your Cart</h2>
      {items.length === 0 ? (
        <p>Cart is empty. <Link to="/">Browse products</Link></p>
      ) : (
        <div className="CartList">
          {items.map((i) => (
            <div className="CartItem" key={i.id}>
              <div className="CartDetails">
                <strong>{i.name}</strong>
                <span>GHS {i.price.toFixed(2)}</span>
              </div>
              <div className="CartControls">
                {(() => { const p = productsMap.get(i.id); const inv = Number(p?.inventory ?? p?.quantity ?? 1); return (
                <input
                  type="number"
                  min={1}
                  max={inv}
                  value={i.qty}
                  onChange={(e) => updateQty(i.id, Number(e.target.value))}
                />
                ); })()}
                <button className="BtnOutline" onClick={() => removeItem(i.id)}>Remove</button>
              </div>
            </div>
          ))}
          <div className="CartTotal">
            <strong>Total:</strong> GHS {total.toFixed(2)}
          </div>
          <Link className="Btn" to="/checkout">Proceed to Checkout</Link>
        </div>
      )}
    </main>
  );
}

export default Cart;
