"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Menu } from 'lucide-react';
import SellerSidebar from './SellerSidebar';
import AuthGuard from '@/components/AuthGuard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch('/api/auth/check-user', {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'omit',
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();
        setIsAdmin(data.isAdmin ?? false);
      } catch (error) {
        console.error('Dashboard layout admin status check failed:', error);
      }
    };

    fetchStatus();
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem('token');
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'omit' });
    router.push('/login');
  };

  return (
    <AuthGuard redirectPath="/login">
      <div className="min-h-screen bg-[var(--bg-base)] flex">
        <SellerSidebar />

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="bg-[var(--bg-nav)] border-b border-[var(--border-default)] px-6 py-4 flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-4">
              {/* Mobile menu button */}
              <button className="md:hidden p-2 rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)]">
                <Menu className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-base font-semibold text-[var(--text-primary)]">Seller Dashboard</h1>
                <p className="text-xs text-[var(--text-muted)]">Manage your products, streams & earnings</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {isAdmin && (
                <Link href="/admin">
                  <button className="btn-secondary text-sm px-4 py-2">
                    Switch to Admin
                  </button>
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="btn-secondary text-sm px-4 py-2 flex items-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            </div>
          </header>

          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
