"use client";

import { useEffect, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import SellerSidebar from './SellerSidebar';
import DynamicHeader from '@/components/seller/DynamicHeader';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
        console.error('Seller layout admin status check failed:', error);
      }
    };

    fetchStatus();
  }, []);

  return (
    <AuthGuard redirectPath="/login">
      <div className="min-h-screen bg-[var(--bg-base)] flex">
        <SellerSidebar />

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0 md:ml-60">
          <DynamicHeader isAdmin={isAdmin} />
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
