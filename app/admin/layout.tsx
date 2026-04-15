import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
