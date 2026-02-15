import { createContext, useContext, useEffect, useState } from 'react';

const SellerAuthContext = createContext();
const SELLERS_KEY = 'vefruit_sellers_v1';
const CURRENT_KEY = 'vefruit_current_seller_v1';

function readSellers() {
  try {
    const raw = localStorage.getItem(SELLERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeSellers(list) {
  try {
    localStorage.setItem(SELLERS_KEY, JSON.stringify(list));
  } catch {}
}

export function SellerAuthProvider({ children }) {
  const [sellers, setSellers] = useState(readSellers);
  const [current, setCurrent] = useState(() => {
    try {
      const raw = localStorage.getItem(CURRENT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    writeSellers(sellers);
  }, [sellers]);

  useEffect(() => {
    try {
      if (current) localStorage.setItem(CURRENT_KEY, JSON.stringify(current));
      else localStorage.removeItem(CURRENT_KEY);
    } catch {}
  }, [current]);

  const register = ({ name, email, password }) => {
    const exists = sellers.find((s) => s.email.toLowerCase() === email.toLowerCase());
    if (exists) throw new Error('Email already registered');
    const seller = { id: Date.now(), name, email, password, approved: false, status: 'pending', createdAt: new Date().toISOString() };
    setSellers((prev) => [seller, ...prev]);
    setCurrent(seller);
    return seller;
  };

  const login = ({ email, password }) => {
    const seller = sellers.find((s) => s.email.toLowerCase() === email.toLowerCase() && s.password === password);
    if (!seller) throw new Error('Invalid credentials');
    if (!seller.approved || seller.status === 'suspended' || seller.status === 'blocked') {
      const reason = seller.status === 'blocked' ? 'blocked' : (seller.status === 'suspended' ? 'suspended' : 'not approved');
      throw new Error(`Seller ${reason}`);
    }
    setCurrent(seller);
    return seller;
  };

  const logout = () => setCurrent(null);

  const updateSeller = (id, patch) => {
    setSellers((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, ...patch } : s));
      const cur = updated.find((s) => s.id === current?.id);
      if (cur && cur.id === id) {
        try { localStorage.setItem(CURRENT_KEY, JSON.stringify(cur)); } catch {}
      }
      return updated;
    });
  };

  const approveSeller = (id) => updateSeller(id, { approved: true, status: 'approved' });
  const suspendSeller = (id) => updateSeller(id, { approved: false, status: 'suspended' });
  const blockSeller = (id) => updateSeller(id, { approved: false, status: 'blocked' });
  const unblockSeller = (id) => updateSeller(id, { approved: true, status: 'approved' });
  const deleteSeller = (id) => {
    setSellers((prev) => prev.filter((s) => s.id !== id));
    if (current?.id === id) setCurrent(null);
  };

  const value = { sellers, current, register, login, logout, approveSeller, suspendSeller, blockSeller, unblockSeller, updateSeller, deleteSeller };
  return <SellerAuthContext.Provider value={value}>{children}</SellerAuthContext.Provider>;
}

export function useSellerAuth() {
  const ctx = useContext(SellerAuthContext);
  if (!ctx) throw new Error('useSellerAuth must be used within SellerAuthProvider');
  return ctx;
}
