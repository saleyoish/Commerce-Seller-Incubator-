"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type User = {
  id: string;
  email: string;
  isAdmin?: boolean;
  is_temp_password?: boolean;
  approval_status?: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (data: { email: string; password: string; name?: string; phone?: string }) => Promise<{ success: boolean; error?: string }>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchMe() {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
        headers,
      });
      if (!res.ok) {
        setUser(null);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setUser({ id: data.id, email: data.email, isAdmin: data.isAdmin ?? false, is_temp_password: data.is_temp_password ?? false, approval_status: data.approval_status ?? null });
    } catch (e) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMe();
  }, []);

  async function login(email: string, password: string) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      console.log('AuthContext login response:', data);
      if (!res.ok) return { success: false, error: data.error || 'Login failed' };
      
      // Store token in localStorage as backup
      if (data.accessToken) {
        localStorage.setItem('token', data.accessToken);
      }
      
      setUser(data.user || null);
      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' };
    }
  }

  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } finally {
      setUser(null);
      localStorage.removeItem('token');
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
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  }

  async function refresh() {
    await fetchMe();
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
