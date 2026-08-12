import useProducts from '../products/useProducts';
import { Link, useSearchParams } from 'react-router-dom';
import { useSellerAuth } from '../auth/SellerAuthContext';
import { useEffect, useMemo, useState } from 'react';
import useHeroSlides from '../hero/useHeroSlides';
import useCategories from '../categories/useCategories';
import { formatCategoryLabel } from '../categories/categoryService';
import { HERO_FALLBACK_IMAGE, PRODUCT_FALLBACK_IMAGE, resolveImageSource, resolveProductImage } from '../utils/images';

function Home() {
  const products = useProducts();
  const categories = useCategories();
  const { sellers } = useSellerAuth();
  const [params] = useSearchParams();
  const q = (params.get('q') || '').toLowerCase();
  const slides = useHeroSlides();
  const [idx, setIdx] = useState(0);
  const n = slides.length;
  useEffect(() => {
    if (n < 2) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % n), 4000);
    return () => clearInterval(id);
  }, [n]);
  const filtered = q
    ? products.filter((p) => {
        const sellerName = p.sellerId ? (sellers.find((s) => s.id === p.sellerId)?.name || '') : '';
        return (
          p.name.toLowerCase().includes(q) ||
          String(p.id).includes(q) ||
          (p.category || '').toLowerCase().includes(q) ||
          (sellerName || '').toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q)
        );
      })
    : products;
  const categoryCounts = useMemo(() => {
    const counts = new Map();
    products.forEach((product) => {
      const key = String(product.category || '').toLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [products]);
  return (
    <main className="Container">
      <section className="HeroLayout">
        <aside className="LeftMenu">
          <h4>Categories</h4>
          <ul>
            {categories.map((category) => (
              <li key={category}>
                <Link to={`/?q=${encodeURIComponent(category)}`} className="CategoryLink">
                  <span>{formatCategoryLabel(category)}</span>
                  <strong>{categoryCounts.get(category) || 0}</strong>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
        <div className="HeroSlider">
          {n === 0 ? (
            <div className="HeroSlide">
              <img className="HeroImg" src={HERO_FALLBACK_IMAGE} alt="hero" />
            </div>
          ) : (
            <div className="HeroSlide">
              <img className="HeroImg" src={resolveImageSource(slides[idx].image, HERO_FALLBACK_IMAGE, 'landscape_16_9')} alt={slides[idx].title} onError={(e) => { e.currentTarget.src = HERO_FALLBACK_IMAGE; }} />
              <div className="HeroCaption">
                <h2>{slides[idx].title}</h2>
                {slides[idx].cta && <a className="Btn" href={slides[idx].cta.href}>{slides[idx].cta.text}</a>}
              </div>
              <button className="HeroPrev" onClick={() => setIdx((idx - 1 + n) % n)}>‹</button>
              <button className="HeroNext" onClick={() => setIdx((idx + 1) % n)}>›</button>
            </div>
          )}
          <div className="HeroDots">
            {slides.map((_, i) => (
              <button key={i} className={`HeroDot ${i === idx ? 'active' : ''}`} onClick={() => setIdx(i)} aria-label={`Slide ${i+1}`}></button>
            ))}
          </div>
        </div>
        <aside className="QuickCards">
          <div className="QuickCard">
            <strong>Fast Delivery</strong>
            <span>Same-day in city</span>
          </div>
          <div className="QuickCard">
            <strong>Sell on veFruit</strong>
            <span>Start earning</span>
          </div>
          <div className="QuickCard">
            <strong>Track Order</strong>
            <span>Stay updated</span>
          </div>
        </aside>
      </section>
      <section className="Landing">
        <h2>Popular Products</h2>
        <div className="Grid">
          {filtered.map((p) => (
            <Link className="Card" key={p.id} to={`/product/${p.id}`}>
              <img
                src={resolveProductImage(p)}
                alt={p.name}
                referrerPolicy="no-referrer"
                onError={(e) => { e.currentTarget.src = PRODUCT_FALLBACK_IMAGE; }}
              />
              <div className="CardBody">
                <h3>{p.name}</h3>
                <p className="Muted">{p.category}</p>
                <p className="Price">GHS {p.price.toFixed(2)}</p>
              </div>
            </Link>
          ))}
          {filtered.length === 0 && (
            <p className="Muted">No products match your search.</p>
          )}
        </div>
      </section>
    </main>
  );
}

export default Home;
