import { createContext, useContext, useEffect, useState } from 'react';

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
    try {
      if (current) localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(current));
      else localStorage.removeItem(CURRENT_USER_KEY);
    } catch {}
  }, [current]);

  const register = async ({ name, email, password, role }) => {
    const exists = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (exists) throw new Error('Email already registered');
    const hashed = await hashPassword(password);
    const user = {
      id: Date.now(),
      name,
      email,
      password: hashed,
      role,
      isVerified: true,
      createdAt: new Date().toISOString(),
    };
    setUsers((prev) => [user, ...prev]);
    setCurrent(user);
    return user;
  };

  const login = async ({ email, password }) => {
    const hashed = await hashPassword(password);
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === hashed);
    if (!user) throw new Error('Invalid credentials');
    setCurrent(user);
    return user;
  };

  const logout = () => setCurrent(null);

  const value = { users, current, register, login, logout };
  return <UserAuthContext.Provider value={value}>{children}</UserAuthContext.Provider>;
}

export function useUserAuth() {
  const ctx = useContext(UserAuthContext);
  if (!ctx) throw new Error('useUserAuth must be used within UserAuthProvider');
  return ctx;
}
