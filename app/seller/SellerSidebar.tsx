'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  BarChart2,
  DollarSign,
  Calendar,
  Users,
  BookOpen,
  Settings,
  Sparkles,
  Moon,
  User,
  ChevronDown,
  ChevronRight,
  Radio,
  Store,
  Tag,
  Video,
  Globe,
  Play,
  Camera,
  Music,
  ShoppingBag,
  Share2,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/seller', icon: LayoutDashboard },
  { label: 'Products', href: '/seller/products', icon: Package },
  { label: 'Sales', href: '/seller/sales', icon: BarChart2 },
  { label: 'Earnings', href: '/seller/earnings', icon: DollarSign },
  { label: 'Schedule', href: '/seller/schedule', icon: Calendar },
  { label: 'Referrals', href: '/seller/referrals', icon: Users },
  { label: 'Training', href: '/seller/training', icon: BookOpen },
  { label: 'Social Posting', href: '/seller/content/social-posting', icon: Share2 },
];

const settingsSubItems = [
  { label: 'Appearance', href: '/seller/settings/appearance', icon: Moon },
  { label: 'Account', href: '/seller/settings/account', icon: User },
  { label: 'Stream', href: '/seller/settings/stream', icon: Radio },
  { label: 'Platforms', href: '/seller/settings/platforms', icon: Store },
  { label: 'Categories', href: '/seller/settings/categories', icon: Tag },
];

export default function SellerSidebar() {
  const pathname = usePathname();
  const [settingsExpanded, setSettingsExpanded] = useState(
    pathname?.startsWith('/seller/settings')
  );

  const isSettingsActive = pathname?.startsWith('/seller/settings');

  return (
    <aside
      className="hidden md:flex flex-col shrink-0 border-r border-[var(--border-default)] fixed left-0 top-0 h-screen"
      style={{ width: 240, background: 'var(--bg-nav)', zIndex: 20 }}
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
          const isActive = pathname === href || (href !== '/seller' && pathname?.startsWith(href + '/'));
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

      {/* Settings & Footer */}
      <div className="px-4 py-3 border-t border-[var(--border-default)] space-y-1">
        {/* Settings with submenu */}
        <div>
          <button
            onClick={() => setSettingsExpanded(!settingsExpanded)}
            className={`nav-item w-full rounded-lg text-sm font-medium flex items-center justify-between ${isSettingsActive ? 'active' : ''}`}
          >
            <div className="flex items-center gap-3">
              <Settings className="w-4 h-4 shrink-0" />
              Settings
            </div>
            {settingsExpanded ? (
              <ChevronDown className="w-4 h-4 shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 shrink-0" />
            )}
          </button>

          {/* Settings Submenu */}
          {settingsExpanded && (
            <div className="mt-1 ml-4 pl-4 border-l border-[var(--border-default)] space-y-1">
              {settingsSubItems.map(({ label, href, icon: Icon }) => {
                const isSubActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`nav-item rounded-lg text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] ${isSubActive ? 'text-[var(--accent-primary)] bg-[rgba(124,58,237,0.08)]' : ''}`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

              </div>
    </aside>
  );
}
