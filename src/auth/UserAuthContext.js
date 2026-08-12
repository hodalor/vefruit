import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';

const UserAuthContext = createContext();
const CURRENT_USER_KEY = 'vefruit_current_user_v1';
const USER_EVENT = 'vefruit-users-changed';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizePhone(phone) {
  return String(phone || '').replace(/\s+/g, '').trim();
}

function buildBuyerProfile(payload = {}) {
  return {
    username: String(payload.username || '').trim().toLowerCase(),
    phone: normalizePhone(payload.phone),
    email: normalizeEmail(payload.email),
    address: String(payload.address || '').trim(),
    idType: String(payload.idType || '').trim(),
    idNumber: String(payload.idNumber || '').trim(),
  };
}

export function UserAuthProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [current, setCurrent] = useState(() => {
    try {
      const raw = localStorage.getItem(CURRENT_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const sync = () => {
      api.get('/users')
        .then((data) => setUsers(data.users || []))
        .catch(() => setUsers([]));
    };
    sync();
    window.addEventListener(USER_EVENT, sync);
    return () => window.removeEventListener(USER_EVENT, sync);
  }, []);
  useEffect(() => {
    try {
      if (current) localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(current));
      else localStorage.removeItem(CURRENT_USER_KEY);
    } catch {}
  }, [current]);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === CURRENT_USER_KEY) {
        try {
          const raw = localStorage.getItem(CURRENT_USER_KEY);
          setCurrent(raw ? JSON.parse(raw) : null);
        } catch {
          setCurrent(null);
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const register = async ({ name, username, email, password, role, phone, address, idType, idNumber }) => {
    const payload = {
      name,
      ...buildBuyerProfile({ username, phone, email, address, idType, idNumber }),
      password,
      role,
    };
    const data = role === 'admin'
      ? await api.post('/users', payload)
      : await api.post('/auth/register-buyer', payload);
    const user = data.user;
    setUsers((prev) => [user, ...prev.filter((entry) => entry.id !== user.id)]);
    if (role !== 'admin') {
      setCurrent(user);
    }
    return user;
  };

  const login = async ({ identifier, email, password }) => {
    const lookup = identifier || email;
    const data = await api.post('/auth/login-user', { identifier: lookup, password });
    const user = data.user;
    setCurrent(user);
    return user;
  };

  const logout = () => setCurrent(null);

  const updateUser = (id, patch) => {
    return api.patch(`/users/${id}`, patch).then((data) => {
      const user = data.user;
      setUsers((prev) => prev.map((entry) => (entry.id === id ? user : entry)));
      if (current?.id === id) setCurrent(user);
      return user;
    });
  };

  const deleteUser = (id) => {
    return api.delete(`/users/${id}`).then(() => {
      setUsers((prev) => prev.filter((u) => u.id !== id));
      if (current?.id === id) setCurrent(null);
    });
  };

  const value = { users, current, register, login, logout, updateUser, deleteUser };
  return <UserAuthContext.Provider value={value}>{children}</UserAuthContext.Provider>;
}

export function useUserAuth() {
  const ctx = useContext(UserAuthContext);
  if (!ctx) throw new Error('useUserAuth must be used within UserAuthProvider');
  return ctx;
}
