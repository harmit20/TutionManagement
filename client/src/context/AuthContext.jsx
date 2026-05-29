import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api, { setAccessToken } from '../services/api';
import { registerPushToken, revokePushToken } from '../services/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const fcmToken              = useRef(null);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
    // Best-effort push registration — don't block login if it fails
    registerPushToken(api).then((t) => { fcmToken.current = t; }).catch(() => {});
    return data.user;
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await revokePushToken(api, fcmToken.current);
      await api.post('/auth/logout');
    } finally {
      setAccessToken('');
      setUser(null);
      fcmToken.current = null;
    }
  }, []);

  // ── Session restore on mount (uses httpOnly refresh-token cookie) ──────────
  useEffect(() => {
    api.post('/auth/refresh')
      .then(({ data }) => { setAccessToken(data.accessToken); return api.get('/auth/me'); })
      .then(({ data }) => setUser(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Handle token expiry signalled by api.js interceptor ───────────────────
  useEffect(() => {
    const handler = () => { setUser(null); setAccessToken(''); };
    window.addEventListener('auth:session-expired', handler);
    return () => window.removeEventListener('auth:session-expired', handler);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
