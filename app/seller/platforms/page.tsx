'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClientSideSupabase, type PlatformConnection, type Seller } from '@/lib/supabase-client';
import { checkUserStatus } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink,
  Settings,
  TrendingUp,
  DollarSign,
  ShoppingBag,
} from 'lucide-react';

// TikTok icon component since lucide doesn't have it
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  );
}

// Whatnot icon component
function WhatnotIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6zm4 4h-2v-2h2v2zm0-4h-2V7h2v6z"/>
    </svg>
  );
}

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
    </svg>
  );
}

type PlatformConfig = {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  status: 'connected' | 'disconnected' | 'pending' | 'setup';
  sales?: number;
  username?: string;
  category?: string;
};

export default function PlatformsPage() {
  const router = useRouter();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPlatformsData();
  }, []);

  const loadPlatformsData = async () => {
    try {
      const supabase = createClientSideSupabase();

      // Check user status via API (avoids RLS issues)
      const { isSeller, isAdmin, seller: sellerData } = await checkUserStatus();
      
      if (!isSeller && !isAdmin) {
        router.push('/login');
        return;
      }

      setSeller(sellerData);

      // Get platform connections (only if seller exists)
      if (sellerData) {
        const { data: connectionsData, error: connectionsError } = await supabase
          .from('platform_connections')
          .select('*')
          .eq('seller_id', sellerData.id);

        if (connectionsError) {
          // Table may not exist yet or RLS policy issue - log but don't break UI
          console.warn('Note: platform_connections table not yet set up or no permissions:', connectionsError.message || connectionsError);
        }

        setConnections(connectionsData || []);
      }
    } catch (error) {
      console.error('Error loading platforms:', error);
      setError('Failed to load platform data');
    } finally {
      setIsLoading(false);
    }
  };

  const getConnectionStatus = (platform: string): PlatformConnection | undefined => {
    return connections.find(c => c.platform === platform);
  };

  const getPlatformConfig = (): PlatformConfig[] => {
    const platforms: PlatformConfig[] = [
      {
        id: 'tiktok',
        name: 'TikTok Shop',
        icon: <TikTokIcon className="w-8 h-8" />,
        color: 'bg-black text-white',
        description: 'Connect TikTok Shop products to your dashboard',
        status: getConnectionStatus('tiktok')?.status as any || 'setup',
        username: getConnectionStatus('tiktok')?.platform_username ?? undefined,
      },
      {
        id: 'whatnot',
        name: 'Whatnot',
        icon: <WhatnotIcon className="w-8 h-8" />,
        color: 'bg-[#FF6B35] text-white',
        description: 'Connect Whatnot shop and sync your listings',
        status: getConnectionStatus('whatnot')?.status as any || 'setup',
        username: getConnectionStatus('whatnot')?.platform_username ?? undefined,
        category: getConnectionStatus('whatnot')?.platform_category ?? undefined,
      },
      {
        id: 'youtube',
        name: 'YouTube Live',
        icon: <YoutubeIcon className="w-8 h-8" />,
        color: 'bg-red-600 text-white',
        description: 'Live streaming + shopping',
        status: getConnectionStatus('youtube')?.status as any || 'setup',
        username: getConnectionStatus('youtube')?.platform_username ?? undefined,
      },
      {
        id: 'facebook',
        name: 'Facebook Shop',
        icon: <FacebookIcon className="w-8 h-8" />,
        color: 'bg-blue-600 text-white',
        description: 'Connect Facebook Shop and sync products into your dashboard',
        status: getConnectionStatus('facebook')?.status as any || 'setup',
        username: getConnectionStatus('facebook')?.platform_username ?? undefined,
      },
      {
        id: 'instagram',
        name: 'Instagram Shop',
        icon: <InstagramIcon className="w-8 h-8" />,
        color: 'bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 text-white',
        description: 'Connect Instagram Shop products to your dashboard',
        status: getConnectionStatus('instagram')?.status as any || 'setup',
        username: getConnectionStatus('instagram')?.platform_username ?? undefined,
      },
    ];

    return platforms;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Connected</Badge>;
      case 'disconnected':
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" /> Disconnected</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Pending</Badge>;
      default:
        return <Badge variant="outline"><Settings className="w-3 h-3 mr-1" /> Setup</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const platforms = getPlatformConfig();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Platform Connections</h1>
        <p className="text-gray-600">Connect and manage your selling platforms</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Platform Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {platforms.map((platform) => (
          <Card key={platform.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-lg ${platform.color}`}>
                  {platform.icon}
                </div>
                {getStatusBadge(platform.status)}
              </div>
              <CardTitle className="mt-4">{platform.name}</CardTitle>
              <CardDescription>{platform.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {platform.status === 'connected' ? (
                <div className="space-y-4">
                  {platform.username && (
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium">@{platform.username}</span>
                    </div>
                  )}
                  {platform.category && (
                    <div className="flex items-center text-sm text-gray-600">
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      {platform.category}
                    </div>
                  )}
                  {platform.sales !== undefined && (
                    <div className="flex items-center text-sm">
                      <DollarSign className="w-4 h-4 mr-2 text-green-600" />
                      <span className="font-medium">${platform.sales.toLocaleString()} sales</span>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Link href={`/seller/platforms/${platform.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Settings className="w-4 h-4 mr-2" />
                        Manage
                      </Button>
                    </Link>
                    <a href={getPlatformUrl(platform.id)} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </a>
                  </div>
                </div>
              ) : platform.status === 'pending' ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Your connection is being processed. Check back soon!
                  </p>
                  <Button variant="outline" className="w-full" disabled>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    {platform.id === 'whatnot' 
                      ? 'Set up your Whatnot seller account to start live auctions.'
                      : `Connect your ${platform.name} account to expand your reach.`}
                  </p>
                  <Link href={`/seller/platforms/${platform.id}`} className="w-full">
                    <Button className="w-full">
                      {platform.id === 'whatnot' ? 'Get Started' : 'Connect'}
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Multi-Stream Info */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle>Multi-Stream with Restream.io</CardTitle>
              <CardDescription>Stream to multiple platforms simultaneously</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Connect Restream.io to broadcast your live show to TikTok, Whatnot, YouTube, 
            Facebook, and Instagram at the same time. Reach more buyers, make more sales.
          </p>
          <Link href="/seller/streaming/setup">
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Set Up Restream
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function getPlatformUrl(platform: string): string {
  switch (platform) {
    case 'tiktok':
      return 'https://seller.tiktok.com';
    case 'whatnot':
      return 'https://www.whatnot.com';
    case 'youtube':
      return 'https://studio.youtube.com';
    case 'facebook':
      return 'https://business.facebook.com';
    case 'instagram':
      return 'https://business.instagram.com';
    default:
      return '#';
  }
}
