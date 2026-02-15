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
    const seller = { id: Date.now(), name, email, password, approved: true };
    setSellers((prev) => [seller, ...prev]);
    setCurrent(seller);
    return seller;
  };

  const login = ({ email, password }) => {
    const seller = sellers.find((s) => s.email.toLowerCase() === email.toLowerCase() && s.password === password);
    if (!seller) throw new Error('Invalid credentials');
    if (!seller.approved) throw new Error('Seller not approved');
    setCurrent(seller);
    return seller;
  };

  const logout = () => setCurrent(null);

  const value = { sellers, current, register, login, logout };
  return <SellerAuthContext.Provider value={value}>{children}</SellerAuthContext.Provider>;
}

export function useSellerAuth() {
  const ctx = useContext(SellerAuthContext);
  if (!ctx) throw new Error('useSellerAuth must be used within SellerAuthProvider');
  return ctx;
}
