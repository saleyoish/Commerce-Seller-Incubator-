"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";

type User = {
  id: string;
  email: string;
  isAdmin?: boolean;
  isSeller?: boolean;
  is_temp_password?: boolean;
  approval_status?: string;
};

type AuthResult = {
  success: boolean;
  error?: string;
  user?: User | null;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  register: (data: { email: string; password: string; name?: string; phone?: string }) => Promise<{ success: boolean; error?: string }>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

function base64UrlDecode(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  return atob(base64 + padding);
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const decoded = base64UrlDecode(parts[1]);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getUserFromToken(token: string): User | null {
  const payload = parseJwtPayload(token);
  if (!payload) return null;

  const userId = typeof payload.userId === 'string' ? payload.userId : null;
  const email = typeof payload.email === 'string' ? payload.email : null;
  const exp = typeof payload.exp === 'number' ? payload.exp : null;

  if (!userId || !email) return null;
  if (exp !== null && exp <= Date.now() / 1000) return null;

  return {
    id: userId,
    email,
    isAdmin: Boolean(payload.isAdmin),
    isSeller: Boolean(payload.isSeller),
    is_temp_password: Boolean(payload.is_temp_password),
    approval_status: typeof payload.approval_status === 'string' ? payload.approval_status : undefined,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const expirationTimer = useRef<number | null>(null);

  const clearExpirationTimer = () => {
    if (expirationTimer.current !== null) {
      window.clearTimeout(expirationTimer.current);
      expirationTimer.current = null;
    }
  };

  const scheduleTokenExpiration = (token: string) => {
    const payload = parseJwtPayload(token);
    if (!payload || typeof payload.exp !== 'number') return;

    const expiresAt = payload.exp * 1000;
    const timeout = expiresAt - Date.now();

    clearExpirationTimer();

    if (timeout <= 0) {
      setUser(null);
      localStorage.removeItem('token');
      return;
    }

    expirationTimer.current = window.setTimeout(() => {
      setUser(null);
      localStorage.removeItem('token');
    }, timeout);
  };

  const initializeAuth = useCallback(() => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      clearExpirationTimer();
      return;
    }

    const decodedUser = getUserFromToken(token);
    if (!decodedUser) {
      setUser(null);
      setLoading(false);
      clearExpirationTimer();
      localStorage.removeItem('token');
      return;
    }

    setUser(decodedUser);
    setLoading(false);
    scheduleTokenExpiration(token);
  }, []);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init = {}) => {
      const url = typeof input === 'string'
        ? input
        : input instanceof Request
          ? input.url
          : String(input);
      const isSameOrigin = typeof url === 'string' && (url.startsWith('/') || url.startsWith(window.location.origin));
      const token = getToken();

      if (isSameOrigin && token) {
        const headers = new Headers((init as RequestInit).headers || {});
        if (!headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        return originalFetch(input, { ...init, headers, credentials: 'omit' });
      }

      return originalFetch(input, init);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    initializeAuth();

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== 'token') return;
      if (!event.newValue) {
        setUser(null);
        clearExpirationTimer();
        return;
      }
      initializeAuth();
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearExpirationTimer();
    };
  }, [initializeAuth]);

  async function login(email: string, password: string) {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || 'Login failed' };

      if (data.accessToken) {
        localStorage.setItem('token', data.accessToken);
        const decodedUser = getUserFromToken(data.accessToken);
        if (!decodedUser) {
          return { success: false, error: 'Invalid authentication token' };
        }

        setUser(decodedUser);
        scheduleTokenExpiration(data.accessToken);
        return { success: true, user: decodedUser };
      } else {
        return { success: false, error: 'Login failed' };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return { success: false, error: errorMessage || 'Login failed' };
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'omit' });
    } finally {
      setUser(null);
      localStorage.removeItem('token');
      clearExpirationTimer();
    }
  }

  async function register(data: { email: string; password: string; name?: string; phone?: string }) {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) return { success: false, error: json.error || 'Registration failed' };
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return { success: false, error: errorMessage || 'Registration failed' };
    }
  }

  async function refresh() {
    initializeAuth();
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
