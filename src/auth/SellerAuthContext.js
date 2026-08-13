import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';

const SellerAuthContext = createContext();
const CURRENT_KEY = 'vefruit_current_seller_v1';
const FARMER_EVENT = 'vefruit-farmers-changed';

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

export function SellerAuthProvider({ children }) {
  const [sellers, setSellers] = useState([]);
  const [current, setCurrent] = useState(() => {
    try {
      const raw = localStorage.getItem(CURRENT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const sync = () => {
      api.get('/farmers')
        .then((data) => setSellers(data.farmers || []))
        .catch(() => setSellers([]));
    };
    sync();
    window.addEventListener(FARMER_EVENT, sync);
    return () => window.removeEventListener(FARMER_EVENT, sync);
  }, []);

  useEffect(() => {
    const onStorage = (event) => {
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

  const register = (payload) => {
    return api.post('/auth/register-farmer', {
      name: payload.name,
      ...buildFarmerProfile(payload),
      password: payload.password,
    }).then((data) => {
      const seller = data.user;
      setSellers((prev) => [seller, ...prev.filter((entry) => entry.id !== seller.id)]);
      setCurrent(seller);
      return seller;
    });
  };

  const login = ({ identifier, email, password }) => {
    const lookup = identifier || email;
    return api.post('/auth/login-farmer', { identifier: lookup, password }).then((data) => {
      const seller = data.user;
      setCurrent(seller);
      return seller;
    });
  };

  const setAuthenticatedSeller = (seller) => {
    setCurrent(seller || null);
    if (seller) {
      setSellers((prev) => [seller, ...prev.filter((entry) => entry.id !== seller.id)]);
    }
  };

  const logout = () => setCurrent(null);

  const updateSellerStatus = (id, status) => {
    return api.patch(`/farmers/${id}/status`, { status }).then((data) => {
      const seller = data.farmer;
      setSellers((prev) => prev.map((entry) => (entry.id === id ? seller : entry)));
      if (current?.id === id) setCurrent(seller);
      return seller;
    });
  };

  const approveSeller = (id) => updateSellerStatus(id, 'approved');
  const rejectSeller = (id) => updateSellerStatus(id, 'rejected');
  const suspendSeller = (id) => updateSellerStatus(id, 'suspended');
  const blockSeller = (id) => updateSellerStatus(id, 'blocked');
  const unblockSeller = (id) => updateSellerStatus(id, 'approved');
  const updateSeller = (id, patch) => {
    return api.patch(`/users/${id}`, patch).then((data) => {
      const seller = data.user;
      setSellers((prev) => prev.map((entry) => (entry.id === id ? seller : entry)));
      if (current?.id === id) setCurrent(seller);
      return seller;
    });
  };
  const resetSellerPassword = (id, password) => {
    return api.patch(`/farmers/${id}/reset-password`, { password }).then((data) => {
      const seller = data.farmer;
      setSellers((prev) => prev.map((entry) => (entry.id === id ? seller : entry)));
      if (current?.id === id) setCurrent(seller);
      return seller;
    });
  };
  const deleteSeller = (id) => {
    return api.delete(`/farmers/${id}`).then(() => {
      setSellers((prev) => prev.filter((s) => s.id !== id));
      if (current?.id === id) setCurrent(null);
    });
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
    resetSellerPassword,
    deleteSeller,
    setAuthenticatedSeller,
  };
  return <SellerAuthContext.Provider value={value}>{children}</SellerAuthContext.Provider>;
}

export function useSellerAuth() {
  const ctx = useContext(SellerAuthContext);
  if (!ctx) throw new Error('useSellerAuth must be used within SellerAuthProvider');
  return ctx;
}
