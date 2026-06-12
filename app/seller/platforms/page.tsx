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

function MetaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
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
        id: 'meta-commerce-shop',
        name: 'Meta Commerce Shop',
        icon: <MetaIcon className="w-8 h-8" />,
        color: 'bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white',
        description: 'Connect Meta Commerce Shop (Facebook & Instagram) and sync products',
        status: getConnectionStatus('meta')?.status as any || 'setup',
        username: getConnectionStatus('meta')?.platform_username ?? undefined,
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
    case 'meta-commerce-shop':
      return 'https://business.facebook.com/commerce';
    default:
      return '#';
  }
}
