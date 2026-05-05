import { createContext, useContext, useEffect, useRef, useState } from 'react';

const UserAuthContext = createContext();
const USERS_KEY = 'vefruit_users_v1';
const CURRENT_USER_KEY = 'vefruit_current_user_v1';

async function hashPassword(pw) {
  try {
    const enc = new TextEncoder().encode(pw);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    const view = new DataView(buf);
    let hex = '';
    for (let i = 0; i < view.byteLength; i++) hex += ('00' + view.getUint8(i).toString(16)).slice(-2);
    return hex;
  } catch {
    return pw;
  }
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizePhone(phone) {
  return String(phone || '').replace(/\s+/g, '').trim();
}

function buildBuyerProfile(payload = {}) {
  return {
    phone: normalizePhone(payload.phone),
    email: normalizeEmail(payload.email),
    address: String(payload.address || '').trim(),
    idType: String(payload.idType || '').trim(),
    idNumber: String(payload.idNumber || '').trim(),
  };
}

function matchesIdentifier(user, identifier) {
  const value = String(identifier || '').trim().toLowerCase();
  if (!value) return false;
  return normalizeEmail(user.email) === value || normalizePhone(user.phone).toLowerCase() === value;
}

function readUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeUsers(list) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(list));
  } catch {}
}

export function UserAuthProvider({ children }) {
  const [users, setUsers] = useState(readUsers);
  const seededRef = useRef(false);
  const [current, setCurrent] = useState(() => {
    try {
      const raw = localStorage.getItem(CURRENT_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => { writeUsers(users); }, [users]);
  useEffect(() => {
    if (seededRef.current) return;
    (async () => {
      try {
        const hasAdmin = users.some((u) => u.role === 'admin');
        if (!hasAdmin) {
          const pw = await hashPassword('admin123');
          const admin = { id: Date.now(), name: 'Admin', email: 'admin@vefruit.local', password: pw, role: 'admin', isVerified: true, createdAt: new Date().toISOString() };
          setUsers((prev) => [admin, ...prev]);
        }
      } catch {}
      seededRef.current = true;
    })();
  }, [users]);
  useEffect(() => {
    try {
      if (current) localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(current));
      else localStorage.removeItem(CURRENT_USER_KEY);
    } catch {}
  }, [current]);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === USERS_KEY) setUsers(readUsers());
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

  const register = async ({ name, email, password, role, phone, address, idType, idNumber }) => {
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);
    const requiresPhone = role !== 'admin';
    if (requiresPhone && !normalizedPhone) throw new Error('Phone number is required');
    const emailExists = normalizedEmail && users.find((u) => normalizeEmail(u.email) === normalizedEmail);
    if (emailExists) throw new Error('Email already registered');
    const phoneExists = normalizedPhone && users.find((u) => normalizePhone(u.phone) === normalizedPhone);
    if (phoneExists) throw new Error('Phone number already registered');
    const hashed = await hashPassword(password);
    const profile = buildBuyerProfile({ phone, email, address, idType, idNumber });
    const user = {
      id: Date.now(),
      name,
      ...profile,
      password: hashed,
      role,
      isVerified: true,
      createdAt: new Date().toISOString(),
    };
    setUsers((prev) => [user, ...prev]);
    setCurrent(user);
    return user;
  };

  const login = async ({ identifier, email, password }) => {
    const lookup = identifier || email;
    const hashed = await hashPassword(password);
    const user = users.find((u) => matchesIdentifier(u, lookup) && u.password === hashed);
    if (!user) throw new Error('Invalid credentials');
    setCurrent(user);
    return user;
  };

  const logout = () => setCurrent(null);

  const updateUser = (id, patch) => {
    setUsers((prev) => {
      const updated = prev.map((u) => (u.id === id ? { ...u, ...patch } : u));
      const cur = updated.find((u) => u.id === current?.id);
      if (cur && cur.id === id) {
        try { localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(cur)); } catch {}
      }
      return updated;
    });
  };

  const deleteUser = (id) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    if (current?.id === id) setCurrent(null);
  };

  const value = { users, current, register, login, logout, updateUser, deleteUser };
  return <UserAuthContext.Provider value={value}>{children}</UserAuthContext.Provider>;
}

export function useUserAuth() {
  const ctx = useContext(UserAuthContext);
  if (!ctx) throw new Error('useUserAuth must be used within UserAuthProvider');
  return ctx;
}
