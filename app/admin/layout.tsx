import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createServerSideSupabase } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if user is authenticated
  const supabase = await createServerSideSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/admin');
  }

  // Check if user is admin
  const { data: admin } = await supabase
    .from('admins')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!admin) {
    // Not an admin, redirect to dashboard
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-8">
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <nav className="flex gap-4">
                <Link href="/admin/sellers">
                  <Button variant="ghost">Sellers</Button>
                </Link>
                <Link href="/admin/products">
                  <Button variant="ghost">Products</Button>
                </Link>
                <Link href="/admin/sales">
                  <Button variant="ghost">Sales</Button>
                </Link>
                <Link href="/admin/payouts">
                  <Button variant="ghost">Payouts</Button>
                </Link>
              </nav>
            </div>
            <Link href="/dashboard">
              <Button variant="outline">Exit Admin</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
