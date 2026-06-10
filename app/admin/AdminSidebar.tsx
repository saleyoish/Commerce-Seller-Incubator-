'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClientSideSupabase } from '@/lib/supabase-client';
import {
  Users,
  Package,
  DollarSign,
  CreditCard,
  Video,
  ListOrdered,
  BookOpen,
  Clock,
  BarChart2,
  Sparkles,
  ShoppingBag,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
  { label: 'Sellers', href: '/admin/sellers', icon: Users },
  { label: 'Products', href: '/admin/products', icon: Package },
  { label: 'Sales', href: '/admin/sales', icon: BarChart2 },
  { label: 'Payouts', href: '/admin/payouts', icon: CreditCard },
  { label: 'Applications', href: '/admin/applications', icon: ListOrdered },
  { label: 'Training', href: '/admin/training', icon: BookOpen },
  { label: 'Content', href: '/admin/content', icon: Video },
  { label: 'TikTok', href: '/admin/tiktok', icon: ShoppingBag },
  { label: 'Waitlist', href: '/admin/waitlist', icon: Clock },
  { label: 'Referrals', href: '/admin/referrals', icon: DollarSign },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClientSideSupabase();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside
      className="hidden md:flex flex-col shrink-0 border-r border-[var(--border-default)]"
      style={{ width: 240, background: 'var(--bg-nav)' }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[var(--border-default)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-[#7C3AED] to-[#06B6D4] rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold gradient-text text-sm leading-none block">Live Commerce</span>
            <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Admin</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <p className="px-5 mb-2 text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Navigation</p>
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || pathname?.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`nav-item mx-2 rounded-lg text-sm font-medium ${isActive ? 'active' : ''}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-[var(--border-default)] space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-[var(--text-muted)] hover:text-[var(--accent-danger)] hover:bg-[rgba(239,68,68,0.1)]"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
        <p className="text-[10px] text-[var(--text-muted)] text-center">Admin Panel v1.0</p>
      </div>
    </aside>
  );
}
