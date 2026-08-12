import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getProduct, loadRecommendations } from '../products/productService';
import { useCart } from '../cart/CartContext';
import { useUserAuth } from '../auth/UserAuthContext';
import { PRODUCT_FALLBACK_IMAGE, resolveProductImage } from '../utils/images';
import { useSellerAuth } from '../auth/SellerAuthContext';

function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recommended, setRecommended] = useState([]);
  const { addItem } = useCart();
  const { current } = useUserAuth();
  const { sellers } = useSellerAuth();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const maxQty = Number(product?.inventory ?? product?.quantity ?? 99);
  const farmer = sellers.find((entry) => String(entry.id) === String(product?.sellerId));

  useEffect(() => {
    setLoading(true);
    getProduct(id)
      .then((data) => {
        setProduct(data);
        setQty(1);
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadRecommendations({ userId: current?.id, q: product?.category || product?.name || '' })
      .then((items) => setRecommended(items.filter((entry) => String(entry.id) !== String(id)).slice(0, 4)))
      .catch(() => setRecommended([]));
  }, [current?.id, id, product?.category, product?.name]);

  const add = () => {
    if (!product) return;
    if (!current) {
      navigate('/register?role=buyer');
      return;
    }
    addItem(product, Math.max(1, Math.min(Number(qty) || 1, maxQty || 1)));
    navigate('/cart');
  };

  if (loading) {
    return (
      <main className="Container">
        <h2>Loading Product...</h2>
      </main>
    );
  }

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
              src={resolveProductImage(product)}
              alt={product.name}
              referrerPolicy="no-referrer"
              onError={(e) => { e.currentTarget.src = PRODUCT_FALLBACK_IMAGE; }}
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
                  max={maxQty}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Math.min(Number(e.target.value || 1), maxQty)))}
                />
              </label>
              <span className="Muted">Max {maxQty}</span>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button className="Btn" onClick={add} disabled={maxQty < 1}>Add to Cart</button>
              <button className="BtnOutline" onClick={() => navigate('/')}>Continue Shopping</button>
              {product?.sellerId && (
                <Link className="BtnOutline" to={`/messages?otherUserId=${encodeURIComponent(product.sellerId)}&productId=${encodeURIComponent(product.id)}`}>
                  Chat With Farmer
                </Link>
              )}
            </div>
            {farmer && (
              <div className="Card" style={{ marginTop: '1rem' }}>
                <div className="CardBody">
                  <strong>Farmer</strong>
                  <div>{farmer.name}</div>
                  {product.location && <div className="Muted">{product.location}</div>}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="Landing">
        <h2>You May Also Like</h2>
        <div className="Grid">
          {recommended.map((item) => (
            <Link className="Card" key={item.id} to={`/product/${item.id}`}>
              <img
                src={resolveProductImage(item)}
                alt={item.name}
                referrerPolicy="no-referrer"
                onError={(e) => { e.currentTarget.src = PRODUCT_FALLBACK_IMAGE; }}
              />
              <div className="CardBody">
                <h3>{item.name}</h3>
                <p className="Muted">{item.category}</p>
                <p className="Price">GHS {item.price.toFixed(2)}</p>
              </div>
            </Link>
          ))}
          {recommended.length === 0 && <p className="Muted">More related produce will appear here.</p>}
        </div>
      </section>
    </main>
  );
}

export default ProductDetail;
