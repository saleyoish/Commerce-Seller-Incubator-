'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
} from 'lucide-react';

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
      <div className="px-4 py-4 border-t border-[var(--border-default)]">
        <p className="text-[10px] text-[var(--text-muted)] text-center">Admin Panel v1.0</p>
      </div>
    </aside>
  );
}
