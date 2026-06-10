import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyJWT } from '@/lib/jwt';
import { db } from '@/lib/db';
import AdminSidebar from './AdminSidebar';
import { LogOut as SignOut } from 'lucide-react';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) {
    redirect('/login?redirect=/admin');
  }

  const payload = await verifyJWT(token);
  if (!payload) {
    redirect('/login?redirect=/admin');
  }

  // Check admin by id (custom auth) or user_id (Supabase auth)
  const { data: admin } = await db
    .from('admins')
    .select('id')
    .or(`id.eq.${payload.userId},user_id.eq.${payload.userId}`)
    .maybeSingle();

  if (!admin) {
    redirect('/seller');
  }

  return (
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
            <a href="/logout">
              <button className="btn-primary text-sm px-4 py-2 flex items-center gap-2">
                <SignOut className="w-3.5 h-3.5" />
                Logout
              </button>
            </a>
          </div>
        </header>

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
