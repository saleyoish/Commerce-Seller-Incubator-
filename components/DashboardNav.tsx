'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DashboardNav() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const res = await fetch('/api/auth/check-user', { credentials: 'omit' });
        if (res.ok) {
          const data = await res.json();
          setIsAdmin(data.isAdmin ?? false);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      } finally {
        setIsLoading(false);
      }
    };
    checkAdminStatus();
  }, []);

  if (isLoading) {
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
