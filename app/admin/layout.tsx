import Link from 'next/link';
import { createServerSideSupabase } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { LogOut } from 'lucide-react';
import AdminSidebar from './AdminSidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSideSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/admin');
  }

  const { data: admin } = await supabase
    .from('admins')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!admin) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex">
      <AdminSidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-[var(--bg-nav)] border-b border-[var(--border-default)] px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <div>
            <h1 className="text-base font-semibold text-[var(--text-primary)]">Admin Dashboard</h1>
            <p className="text-xs text-[var(--text-muted)]">Manage sellers, products &amp; payouts</p>
          </div>
          <Link href="/dashboard">
            <button className="btn-secondary text-sm px-4 py-2 flex items-center gap-2">
              <LogOut className="w-3.5 h-3.5" />
              Exit Admin
            </button>
          </Link>
        </header>

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
