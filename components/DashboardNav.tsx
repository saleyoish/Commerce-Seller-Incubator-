'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClientSideSupabase } from '@/lib/supabase-client';

export default function DashboardNav() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const supabase = createClientSideSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: admin } = await supabase
            .from('admins')
            .select('id')
            .eq('user_id', user.id)
            .single();
          
          setIsAdmin(!!admin);
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
