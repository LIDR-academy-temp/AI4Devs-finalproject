import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { apiGet, apiPost, setUnauthorizedHandler } from '@/api/client';
import { clearSession, getToken, setToken } from './session';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'ANALYST';
  company: { id: string; name: string };
}

interface AuthState {
  user: SessionUser | null;
  /** true mientras se verifica con /auth/me el token guardado al cargar la página */
  loading: boolean;
  login: (email: string, password: string) => Promise<SessionUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState<boolean>(() => getToken() !== null);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  // Un 401 en cualquier llamada protegida limpia la sesión y devuelve al login
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    return () => setUnauthorizedHandler(undefined);
  }, []);

  useEffect(() => {
    if (!getToken()) return;
    let cancelled = false;
    apiGet<SessionUser>('/auth/me')
      .then((me) => !cancelled && setUser(me))
      .catch(() => !cancelled && clearSession())
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiPost<{ accessToken: string; user: SessionUser }>('/auth/login', {
      email,
      password,
    });
    setToken(result.accessToken);
    setUser(result.user);
    return result.user;
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return context;
}
