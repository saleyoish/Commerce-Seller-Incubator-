"use client";

import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import AdminSidebar from './AdminSidebar';
import { LogOut as SignOut } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleLogout = async () => {
    localStorage.removeItem('token');
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'omit' });
    router.push('/login');
  };

  return (
    <AuthGuard requireAdmin redirectPath="/login">
      <div className="min-h-screen bg-[var(--bg-base)] flex">
        <AdminSidebar />

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="bg-[var(--bg-nav)] border-b border-[var(--border-default)] px-6 py-4 flex items-center justify-between sticky top-0 z-30">
            <div>
              <h1 className="text-base font-semibold text-[var(--text-primary)]">Admin Dashboard</h1>
              <p className="text-xs text-[var(--text-muted)]">Manage sellers, products &amp; payouts</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleLogout}
                className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
              >
                <SignOut className="w-3.5 h-3.5" />
                Logout
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
