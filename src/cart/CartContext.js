import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { loadProducts } from '../products/productService';

const CartContext = createContext();

const STORAGE_KEY = 'vefruit_cart_v1';

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const addItem = (product, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      const prod = loadProducts().find((p) => p.id === product.id);
      const inv = Number(prod?.inventory ?? prod?.quantity ?? Infinity);
      if (existing) {
        const newQty = Math.min(inv, existing.qty + qty);
        return prev.map((i) => (i.id === product.id ? { ...i, qty: newQty } : i));
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          qty: Math.min(inv, qty),
          sellerId: product.sellerId || null,
        },
      ];
    });
  };

  const removeItem = (id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQty = (id, qty) => {
    const prod = loadProducts().find((p) => p.id === id);
    const inv = Number(prod?.inventory ?? prod?.quantity ?? Infinity);
    const next = Math.min(Math.max(1, qty), inv);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty: next } : i)));
  };

  const clearCart = () => setItems([]);

  const total = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.qty, 0),
    [items]
  );

  const value = { items, addItem, removeItem, updateQty, clearCart, total };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
