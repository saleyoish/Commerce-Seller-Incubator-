'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  BarChart2,
  Store,
  Video,
  Clapperboard,
  DollarSign,
  Calendar,
  Users,
  BookOpen,
  Settings,
  Sparkles,
  Radio,
  Share2,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Products', href: '/dashboard/products', icon: Package },
  { label: 'Sales', href: '/dashboard/sales', icon: BarChart2 },
  { label: 'Platforms', href: '/dashboard/platforms', icon: Store },
  { label: 'Go Live', href: '/dashboard/streaming', icon: Radio },
  { label: 'Content', href: '/dashboard/content', icon: Clapperboard },
  { label: 'Social Media', href: '/dashboard/social-media', icon: Share2 },
  { label: 'Earnings', href: '/dashboard/earnings', icon: DollarSign },
  { label: 'Schedule', href: '/dashboard/schedule', icon: Calendar },
  { label: 'Referrals', href: '/dashboard/referrals', icon: Users },
  { label: 'Training', href: '/dashboard/training', icon: BookOpen },
];

export default function SellerSidebar() {
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
            <span className="font-bold gradient-text text-sm leading-none block">Isellish</span>
            <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Seller</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <p className="px-5 mb-2 text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Menu</p>
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
        <p className="text-[10px] text-[var(--text-muted)] text-center">Seller Dashboard v1.0</p>
      </div>
    </aside>
  );
}
