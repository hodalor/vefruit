import { createContext, useContext, useEffect, useState } from 'react';

const SellerAuthContext = createContext();
const SELLERS_KEY = 'vefruit_sellers_v1';
const CURRENT_KEY = 'vefruit_current_seller_v1';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizePhone(phone) {
  return String(phone || '').replace(/\s+/g, '').trim();
}

function buildFarmerProfile(payload = {}) {
  return {
    phone: normalizePhone(payload.phone),
    email: normalizeEmail(payload.email),
    address: String(payload.address || '').trim(),
    idType: String(payload.idType || '').trim(),
    idNumber: String(payload.idNumber || '').trim(),
    businessName: String(payload.businessName || '').trim(),
    businessAddress: String(payload.businessAddress || '').trim(),
    businessPhone: normalizePhone(payload.businessPhone),
    registrationNumber: String(payload.registrationNumber || '').trim(),
    bankName: String(payload.bankName || '').trim(),
    branchName: String(payload.branchName || '').trim(),
    branchCode: String(payload.branchCode || '').trim(),
    accountName: String(payload.accountName || '').trim(),
    accountNumber: String(payload.accountNumber || '').trim(),
    mobileMoneyNumber: normalizePhone(payload.mobileMoneyNumber),
    mobileMoneyMtnName: String(payload.mobileMoneyMtnName || '').trim(),
  };
}

function matchesIdentifier(user, identifier) {
  const value = String(identifier || '').trim().toLowerCase();
  if (!value) return false;
  return normalizeEmail(user.email) === value || normalizePhone(user.phone).toLowerCase() === value;
}

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
    const onStorage = (event) => {
      if (event.key === SELLERS_KEY) {
        setSellers(readSellers());
      }
      if (event.key === CURRENT_KEY) {
        try {
          const raw = localStorage.getItem(CURRENT_KEY);
          setCurrent(raw ? JSON.parse(raw) : null);
        } catch {
          setCurrent(null);
        }
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    try {
      if (current) localStorage.setItem(CURRENT_KEY, JSON.stringify(current));
      else localStorage.removeItem(CURRENT_KEY);
    } catch {}
  }, [current]);

  const register = ({ name, email, password, phone, address, idType, idNumber, businessName, businessAddress, businessPhone, registrationNumber, bankName, branchName, branchCode, accountName, accountNumber, mobileMoneyNumber, mobileMoneyMtnName }) => {
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) throw new Error('Phone number is required');
    const emailExists = normalizedEmail && sellers.find((s) => normalizeEmail(s.email) === normalizedEmail);
    if (emailExists) throw new Error('Email already registered');
    const phoneExists = sellers.find((s) => normalizePhone(s.phone) === normalizedPhone);
    if (phoneExists) throw new Error('Phone number already registered');
    const profile = buildFarmerProfile({
      phone,
      email,
      address,
      idType,
      idNumber,
      businessName,
      businessAddress,
      businessPhone,
      registrationNumber,
      bankName,
      branchName,
      branchCode,
      accountName,
      accountNumber,
      mobileMoneyNumber,
      mobileMoneyMtnName,
    });
    const seller = {
      id: Date.now(),
      name,
      ...profile,
      password,
      approved: false,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setSellers((prev) => [seller, ...prev]);
    setCurrent(seller);
    return seller;
  };

  const login = ({ identifier, email, password }) => {
    const lookup = identifier || email;
    const seller = sellers.find((s) => matchesIdentifier(s, lookup) && s.password === password);
    if (!seller) throw new Error('Invalid credentials');
    if (!seller.approved || seller.status === 'suspended' || seller.status === 'blocked' || seller.status === 'rejected') {
      const reason = seller.status === 'blocked'
        ? 'blocked'
        : (seller.status === 'suspended'
          ? 'suspended'
          : (seller.status === 'rejected' ? 'rejected' : 'not approved'));
      throw new Error(`Farmer ${reason}`);
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
  const rejectSeller = (id) => updateSeller(id, { approved: false, status: 'rejected' });
  const suspendSeller = (id) => updateSeller(id, { approved: false, status: 'suspended' });
  const blockSeller = (id) => updateSeller(id, { approved: false, status: 'blocked' });
  const unblockSeller = (id) => updateSeller(id, { approved: true, status: 'approved' });
  const deleteSeller = (id) => {
    setSellers((prev) => prev.filter((s) => s.id !== id));
    if (current?.id === id) setCurrent(null);
  };

  const value = {
    sellers,
    current,
    register,
    login,
    logout,
    approveSeller,
    rejectSeller,
    suspendSeller,
    blockSeller,
    unblockSeller,
    updateSeller,
    deleteSeller,
  };
  return <SellerAuthContext.Provider value={value}>{children}</SellerAuthContext.Provider>;
}

export function useSellerAuth() {
  const ctx = useContext(SellerAuthContext);
  if (!ctx) throw new Error('useSellerAuth must be used within SellerAuthProvider');
  return ctx;
}
