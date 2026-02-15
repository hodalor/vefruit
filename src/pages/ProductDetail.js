import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadProducts } from '../products/productService';
import { useCart } from '../cart/CartContext';
import { useUserAuth } from '../auth/UserAuthContext';

function ProductDetail() {
  const { id } = useParams();
  const pid = Number(id);
  const product = useMemo(() => loadProducts().find((p) => p.id === pid), [pid]);
  const { addItem } = useCart();
  const { current } = useUserAuth();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);

  const src = (() => {
    const base = product ? (product.image || (product.images && product.images[0]) || 'https://placehold.co/600x400?text=Product') : 'https://placehold.co/600x400?text=Product';
    if (typeof base === 'string' && base.startsWith('http')) {
      const hostPath = base.replace(/^https?:\/\//, '');
      return `https://images.weserv.nl/?url=${hostPath}&w=800&h=500&fit=cover`;
    }
    return base;
  })();

  const add = () => {
    if (!product) return;
    if (!current) {
      navigate('/register?role=buyer');
      return;
    }
    addItem(product, qty);
    navigate('/cart');
  };

  if (!product) {
    return (
      <main className="Container">
        <h2>Product Not Found</h2>
        <button className="BtnOutline" onClick={() => navigate('/')}>Back to Home</button>
      </main>
    );
  }

  return (
    <main className="Container">
      <section className="ProductDetail">
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 540px) 1fr', gap: '1.5rem', alignItems: 'start' }}>
          <div>
            <img
              src={src}
              alt={product.name}
              referrerPolicy="no-referrer"
              onError={(e) => { e.currentTarget.src = 'https://placehold.co/600x400?text=Product'; }}
              style={{ width: '100%', height: 'auto', borderRadius: 12, border: '1px solid #e2e8f0' }}
            />
          </div>
          <div>
            <h2 style={{ marginTop: 0 }}>{product.name}</h2>
            <p className="Muted">{product.category}</p>
            <p className="Price" style={{ fontSize: '1.25rem' }}>GHS {product.price.toFixed(2)}</p>
            {product.description && <p style={{ marginTop: '0.75rem' }}>{product.description}</p>}
            {typeof product.inventory !== 'undefined' && (
              <p style={{ marginTop: '0.5rem', color: '#334155' }}>In stock: {product.inventory}</p>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '120px auto', gap: '0.75rem', alignItems: 'center', marginTop: '0.75rem' }}>
              <label>
                Quantity
                <input
                  type="number"
                  min={1}
                  max={Number(product.inventory ?? product.quantity ?? 99)}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Math.min(Number(e.target.value || 1), Number(product.inventory ?? product.quantity ?? 99))))}
                />
              </label>
              <span className="Muted">Max {Number(product.inventory ?? product.quantity ?? 99)}</span>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button className="Btn" onClick={add} disabled={Number(product.inventory ?? 0) < 1}>Add to Cart</button>
              <button className="BtnOutline" onClick={() => navigate('/')}>Continue Shopping</button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default ProductDetail;
