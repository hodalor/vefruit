import { useEffect, useState } from 'react';
import { getProductEventName, loadProducts } from './productService';

export default function useProducts() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const sync = () => loadProducts().then(setProducts).catch(() => setProducts([]));

    sync();
    window.addEventListener(getProductEventName(), sync);
    return () => {
      window.removeEventListener(getProductEventName(), sync);
    };
  }, []);

  return products;
}
