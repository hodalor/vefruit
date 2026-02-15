import { useEffect, useState } from 'react';
import { loadProducts } from './productService';

export default function useProducts() {
  const [products, setProducts] = useState([]);
  useEffect(() => {
    setProducts(loadProducts());
  }, []);
  return products;
}
