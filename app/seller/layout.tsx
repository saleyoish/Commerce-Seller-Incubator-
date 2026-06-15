"use client";

import { useAuth } from '@/context/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import SellerSidebar from './SellerSidebar';
import DynamicHeader from '@/components/seller/DynamicHeader';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin ?? false;

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
