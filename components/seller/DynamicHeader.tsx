'use client';

import { usePathname } from 'next/navigation';
import { LogOut, Menu, Radio } from 'lucide-react';
import Link from 'next/link';
import { createClientSideSupabase } from '@/lib/supabase-client';
import { GlobalGoLiveButton } from '@/components/streaming/GlobalGoLiveButton';

interface DynamicHeaderProps {
  isAdmin?: boolean;
}

export default function DynamicHeader({ isAdmin }: DynamicHeaderProps) {
  const pathname = usePathname();

  // Dynamic page information based on current route
  const getPageInfo = () => {
    const path = pathname || '';
    
    if (path === '/seller' || path === '/seller/') {
      return {
        title: 'Seller Dashboard',
        description: 'Manage your products, streams & earnings',
        showGoLive: true
      };
    }
    
    if (path.startsWith('/seller/products')) {
      return {
        title: 'Products',
        description: 'Upload and manage your products for live selling',
        showGoLive: true
      };
    }
    
    if (path.startsWith('/seller/sales')) {
      return {
        title: 'Sales',
        description: 'Manage your sales and transactions',
        showGoLive: true
      };
    }
    
    if (path.startsWith('/seller/earnings')) {
      return {
        title: 'Earnings',
        description: 'Track your revenue and payouts',
        showGoLive: true
      };
    }
    
    if (path.startsWith('/seller/streaming')) {
      return {
        title: 'Streaming',
        description: 'Go live and manage your streams',
        showGoLive: true
      };
    }
    
    if (path.startsWith('/seller/schedule')) {
      return {
        title: 'Schedule',
        description: 'Plan your upcoming live streams',
        showGoLive: true
      };
    }
    
    if (path.startsWith('/seller/referrals')) {
      return {
        title: 'Referrals',
        description: 'Invite friends and earn rewards',
        showGoLive: true
      };
    }
    
    if (path.startsWith('/seller/training')) {
      return {
        title: 'Training',
        description: 'Learn how to sell live effectively',
        showGoLive: true
      };
    }
    
    if (path.startsWith('/seller/settings')) {
      if (path.includes('/account')) {
        return {
          title: 'Account Settings',
          description: 'Manage your account information and security',
          showGoLive: true
        };
      }
      if (path.includes('/appearance')) {
        return {
          title: 'Appearance',
          description: 'Customize your dashboard theme',
          showGoLive: true
        };
      }
      if (path.includes('/stream')) {
        return {
          title: 'Stream Settings',
          description: 'Configure your streaming setup and restream settings',
          showGoLive: true
        };
      }
      if (path.includes('/platforms')) {
        return {
          title: 'Platforms',
          description: 'Connect your social media and streaming platforms',
          showGoLive: true
        };
      }
      if (path.includes('/categories')) {
        return {
          title: 'Categories',
          description: 'Manage product categories',
          showGoLive: true
        };
      }
      return {
        title: 'Settings',
        description: 'Manage your dashboard preferences',
        showGoLive: true
      };
    }
    
    if (path.startsWith('/seller/platforms')) {
      return {
        title: 'Platforms',
        description: 'Connect and manage your selling platforms',
        showGoLive: true
      };
    }
    
    if (path.startsWith('/seller/content')) {
      return {
        title: 'Content',
        description: 'Manage your clips and recordings',
        showGoLive: true
      };
    }
    
    if (path.startsWith('/seller/social-media')) {
      return {
        title: 'Social Media',
        description: 'Manage your social media presence',
        showGoLive: true
      };
    }
    
    if (path.startsWith('/seller/tiktok-shop')) {
      return {
        title: 'TikTok Shop',
        description: 'Manage your TikTok Shop integration',
        showGoLive: true
      };
    }
    
    // Default fallback - show Go Live button on all seller pages
    return {
      title: 'Seller Dashboard',
      description: 'Manage your products, streams & earnings',
      showGoLive: true
    };
  };

  const pageInfo = getPageInfo();

  return (
    <header className="bg-[var(--bg-nav)] border-b border-[var(--border-default)] px-6 py-5 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        <button className="md:hidden p-2 rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)]">
          <Menu className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-base font-semibold text-[var(--text-primary)]">{pageInfo.title}</h1>
          <p className="text-xs text-[var(--text-muted)]">{pageInfo.description}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {/* Go Live - Primary Action (only show on relevant pages) */}
        {pageInfo.showGoLive && (
          <GlobalGoLiveButton>
            <div className="btn-primary text-sm px-5 py-2.5 flex items-center gap-2 font-semibold shadow-lg shadow-purple-500/20 cursor-pointer">
              <Radio className="w-5 h-5 animate-pulse" />
              <span>Go Live</span>
            </div>
          </GlobalGoLiveButton>
        )}
        
        {isAdmin && (
          <Link href="/admin">
            <button className="btn-secondary text-sm px-4 py-2">
              Switch to Admin
            </button>
          </Link>
        )}
        <Link href="/logout">
          <button 
            className="btn-secondary text-sm px-4 py-2 flex items-center gap-2"
            onClick={async () => {
              const supabase = createClientSideSupabase();
              await supabase.auth.signOut();
            }}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Log Out</span>
          </button>
        </Link>
      </div>
    </header>
  );
}
