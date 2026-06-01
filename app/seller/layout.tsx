import { createServerSideSupabase } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import SellerSidebar from './SellerSidebar';
import DynamicHeader from '@/components/seller/DynamicHeader';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSideSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.log("i am in dashboard")
    console.log("Auth check:", { user});
    redirect('/login?redirect=/seller');
  }

  // Check if user is admin - admins can also access seller dashboard
  const { data: admin } = await supabase
    .from('admins')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  const isAdmin = !!admin;

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex">
      <SellerSidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-60">
        {/* Dynamic Header */}
        <DynamicHeader isAdmin={isAdmin} />

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
