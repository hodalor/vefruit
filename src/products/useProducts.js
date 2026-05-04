import { useEffect, useState } from 'react';
import { getProductEventName, loadProducts } from './productService';

export default function useProducts() {
  const [products, setProducts] = useState(() => loadProducts());

  useEffect(() => {
    const sync = () => setProducts(loadProducts());
    const onStorage = (event) => {
      if (event.key === 'vefruit_products_v1') {
        sync();
      }
    };

    sync();
    window.addEventListener(getProductEventName(), sync);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(getProductEventName(), sync);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return products;
}
