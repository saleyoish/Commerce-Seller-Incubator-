'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function DashboardNav() {
  const { user, loading } = useAuth();
  const isAdmin = user?.isAdmin ?? false;

  if (loading) {
    return (
      <div>
        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-4 uppercase tracking-widest">Dashboard</h4>
        <ul className="space-y-2 text-sm text-[var(--text-muted)]">
          <li className="animate-pulse">Loading...</li>
        </ul>
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-4 uppercase tracking-widest">Dashboard</h4>
      <ul className="space-y-2 text-sm text-[var(--text-muted)]">
        {isAdmin ? (
          <li><Link href="/admin" className="hover:text-[var(--text-primary)] transition-colors">Admin Dashboard</Link></li>
        ) : (
          <>
            <li><Link href="/dashboard" className="hover:text-[var(--text-primary)] transition-colors">My Dashboard</Link></li>
            <li><Link href="/dashboard/earnings" className="hover:text-[var(--text-primary)] transition-colors">Earnings</Link></li>
            <li><Link href="/dashboard/products" className="hover:text-[var(--text-primary)] transition-colors">Products</Link></li>
            <li><Link href="/dashboard/sales" className="hover:text-[var(--text-primary)] transition-colors">Sales</Link></li>
            <li><Link href="/dashboard/schedule" className="hover:text-[var(--text-primary)] transition-colors">Schedule</Link></li>
          </>
        )}
      </ul>
    </div>
  );
}
