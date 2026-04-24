import Link from 'next/link';
import { createServerSideSupabase } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { LogOut, Menu } from 'lucide-react';
import SellerSidebar from './SellerSidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSideSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/dashboard');
  }

  // Check if user is admin - admins can also access seller dashboard
  const { data: admin } = await supabase
    .from('admins')
    .select('id')
    .eq('user_id', user.id)
    .single();

  const isAdmin = !!admin;

  return (
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
            <Link href="/logout">
              <button className="btn-secondary text-sm px-4 py-2 flex items-center gap-2">
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
