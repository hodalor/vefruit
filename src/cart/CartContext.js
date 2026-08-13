import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useUserAuth } from '../auth/UserAuthContext';
import { useSellerAuth } from '../auth/SellerAuthContext';

const CartContext = createContext();

const STORAGE_KEY = 'vefruit_cart_v1';

function getOwnerKey({ buyerCurrent, sellerCurrent }) {
  if (buyerCurrent?.id) return `buyer:${buyerCurrent.id}`;
  if (sellerCurrent?.id) return `farmer:${sellerCurrent.id}`;
  return 'guest';
}

function readCart(ownerKey) {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${ownerKey}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const { current: buyerCurrent } = useUserAuth();
  const { current: sellerCurrent } = useSellerAuth();
  const ownerKey = useMemo(
    () => getOwnerKey({ buyerCurrent, sellerCurrent }),
    [buyerCurrent, sellerCurrent]
  );
  const [items, setItems] = useState(() => readCart(ownerKey));

  useEffect(() => {
    setItems(readCart(ownerKey));
  }, [ownerKey]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}:${ownerKey}`, JSON.stringify(items));
    } catch {}
  }, [items, ownerKey]);

  const addItem = (product, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      const inv = Number(product?.inventory ?? product?.quantity ?? Infinity);
      const safeQty = Math.max(1, Number(qty) || 1);
      if (existing) {
        const newQty = Math.min(inv, existing.qty + safeQty);
        return prev.map((i) => (i.id === product.id ? { ...i, qty: newQty } : i));
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          qty: Math.min(inv, safeQty),
          sellerId: product.sellerId || null,
        },
      ];
    });
  };

  const removeItem = (id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQty = (id, qty, maxQty = Infinity) => {
    const next = Math.min(Math.max(1, Number(qty) || 1), Number(maxQty) || Infinity);
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
