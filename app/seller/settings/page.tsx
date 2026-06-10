'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import {
  Radio,
  Store,
  Tag,
  Moon,
  User,
  Palette,
  ChevronRight as ChevronRightIcon,
} from 'lucide-react';

const SETTINGS_SECTIONS = [
  {
    id: 'appearance',
    title: 'Appearance',
    description: 'Customize your dashboard theme',
    icon: Palette,
    href: '/seller/settings/appearance',
    color: 'text-[var(--accent-primary)]',
  },
  {
    id: 'account',
    title: 'Account',
    description: 'Manage your account information and security',
    icon: User,
    href: '/seller/settings/account',
    color: 'text-[var(--accent-secondary)]',
  },
  {
    id: 'stream',
    title: 'Stream',
    description: 'Multi-Stream / Restream setup',
    icon: Radio,
    href: '/seller/settings/stream',
    color: 'text-purple-500',
  },
  {
    id: 'platforms',
    title: 'Platforms',
    description: 'Connect YouTube, Instagram, Facebook, Whatnot, TikTok',
    icon: Store,
    href: '/seller/settings/platforms',
    color: 'text-blue-500',
  },
  {
    id: 'categories',
    title: 'Categories',
    description: 'Manage product categories',
    icon: Tag,
    href: '/seller/settings/categories',
    color: 'text-orange-500',
  },
];

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-6">
        {/* Settings Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SETTINGS_SECTIONS.map((section) => (
            <Link key={section.id} href={section.href}>
              <div className="card-premium p-4 flex items-center gap-4 hover:border-[var(--accent-primary)] transition-colors cursor-pointer group h-full">
                <div className="w-12 h-12 rounded-lg bg-[var(--bg-raised)] flex items-center justify-center shrink-0">
                  <section.icon className={`w-6 h-6 ${section.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                    {section.title}
                  </h3>
                  <p className="text-sm text-[var(--text-muted)] truncate">{section.description}</p>
                </div>
                <ChevronRightIcon className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] shrink-0" />
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Access Info */}
        <Card className="card-premium bg-[var(--bg-raised)]">
          <CardContent className="p-4">
            <p className="text-sm text-[var(--text-muted)]">
              <strong className="text-[var(--text-primary)]">Tip:</strong> Use the settings menu above to configure your streaming setup, 
              connect social media platforms, manage product categories, customize your dashboard appearance, and update your account information.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
