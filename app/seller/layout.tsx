import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyJWT } from '@/lib/jwt';
import { db } from '@/lib/db';
import SellerSidebar from './SellerSidebar';
import DynamicHeader from '@/components/seller/DynamicHeader';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) {
    redirect('/login?redirect=/seller');
  }

  const payload = await verifyJWT(token);
  if (!payload) {
    redirect('/login?redirect=/seller');
  }

  // Check if user is admin — admins can also access seller dashboard
  const { data: admin } = await db
    .from('admins')
    .select('id')
    .eq('user_id', payload.userId)
    .maybeSingle();

  const isAdmin = !!admin;

  return (
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
  );
}
