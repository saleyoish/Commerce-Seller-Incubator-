'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClientSideSupabase, type PlatformConnection } from '@/lib/supabase-client';
import { checkUserStatus } from '@/lib/auth';
import { 
  Play, 
  Camera, 
  Globe, 
  ShoppingBag, 
  Music,
  ExternalLink,
  ChevronRight,
  Settings2,
  Store,
  Video,
  CheckCircle,
  AlertCircle,
  Settings,
  Loader2
} from 'lucide-react';

const INTEGRATIONS = [
  { 
    id: 'youtube', 
    name: 'YouTube', 
    icon: Play, 
    color: 'text-red-500', 
    bgColor: 'bg-red-500/10',
    href: '/seller/platforms/youtube',
    description: 'Connect your YouTube channel for live streaming'
  },
  { 
    id: 'meta-commerce-shop', 
    name: 'Meta Commerce Shop', 
    icon: Globe, 
    color: 'text-blue-500', 
    bgColor: 'bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10',
    href: '/seller/platforms/meta-commerce-shop',
    description: 'Connect your Meta Commerce Shop (Facebook & Instagram) and sync products'
  },
  { 
    id: 'whatnot', 
    name: 'Whatnot', 
    icon: ShoppingBag, 
    color: 'text-orange-500', 
    bgColor: 'bg-orange-500/10',
    href: '/seller/platforms/whatnot',
    description: 'Connect your Whatnot shop and sync products'
  },
  { 
    id: 'tiktok', 
    name: 'TikTok', 
    icon: Music, 
    color: 'text-white', 
    bgColor: 'bg-gray-800',
    href: '/seller/platforms/tiktok',
    description: 'Connect your TikTok Shop and sync products'
  },
];

export default function PlatformsSettingsPage() {
  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      const supabase = createClientSideSupabase();
      const { isSeller, seller: sellerData } = await checkUserStatus();
      
      if (sellerData) {
        const { data: connectionsData, error } = await supabase
          .from('platform_connections')
          .select('*')
          .eq('seller_id', sellerData.id);

        if (!error && connectionsData) {
          setConnections(connectionsData);
        }
      }
    } catch (error) {
      console.error('Error loading connections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getConnectionStatus = (platform: string): PlatformConnection | undefined => {
    // For meta-commerce-shop, check for 'meta' platform in database
    if (platform === 'meta-commerce-shop') {
      return connections.find(c => c.platform === 'meta');
    }
    return connections.find(c => c.platform === platform);
  };

  const getStatusBadge = (platformId: string) => {
    const connection = getConnectionStatus(platformId);
    const status = connection?.status || 'setup';
    
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-500 text-white"><CheckCircle className="w-3 h-3 mr-1" /> Connected</Badge>;
      case 'disconnected':
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" /> Disconnected</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Pending</Badge>;
      default:
        return <Badge variant="outline"><Settings className="w-3 h-3 mr-1" /> Setup</Badge>;
    }
  };

  const getConnectionBadge = (platformId: string) => {
    const connection = getConnectionStatus(platformId);
    const status = connection?.status || 'setup';
    
    if (status === 'connected') {
      return (
        <Badge className="text-xs bg-green-500 text-white border-green-500">
          Connected
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs text-[var(--text-muted)] border-red-300 text-red-400">
        Not Connected
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-6">
        {/* Integrations Grid */}
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)] flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-[var(--accent-primary)]" />
              Integrations
            </CardTitle>
            <CardDescription className="text-[var(--text-muted)]">
              Connect your social media and streaming platforms for multi-platform broadcasting
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {INTEGRATIONS.map((platform) => (
                <Link key={platform.id} href={platform.href}>
                  <div className="flex items-center justify-between p-4 border border-[var(--border-default)] rounded-lg hover:bg-[var(--bg-raised)] hover:border-[var(--accent-primary)] transition-all cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${platform.bgColor} flex items-center justify-center`}>
                        <platform.icon className={`w-5 h-5 ${platform.color}`} />
                      </div>
                      <div>
                        <span className="font-medium text-[var(--text-primary)] block">{platform.name}</span>
                        <span className="text-xs text-[var(--text-muted)]">{platform.description}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(platform.id)}
                      <ExternalLink className="w-4 h-4 text-[var(--text-muted)]" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-[var(--bg-raised)] rounded-lg">
              <Link href="/seller/platforms" className="flex items-center justify-center gap-2 text-[var(--accent-primary)] hover:underline text-sm">
                <ExternalLink className="w-4 h-4" />
                View All Platform Settings
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Connected Platforms Summary */}
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Connected Platforms</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">
              Overview of your platform connections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {INTEGRATIONS.map((platform) => (
                <div key={platform.id} className="p-3 bg-[var(--bg-raised)] rounded-lg border border-[var(--border-default)] text-center">
                  <platform.icon className={`w-6 h-6 ${platform.color} mx-auto mb-2`} />
                  <p className="text-sm font-medium text-[var(--text-primary)]">{platform.name}</p>
                  {getConnectionBadge(platform.id)}
                </div>
              ))}
            </div>
            <p className="text-sm text-[var(--text-muted)] mt-4 text-center">
              Click on any platform above to connect your account
            </p>
          </CardContent>
        </Card>

        {/* Stream Platforms Link */}
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)] flex items-center gap-2">
              <Video className="w-5 h-5 text-[var(--accent-primary)]" />
              Streaming Setup
            </CardTitle>
            <CardDescription className="text-[var(--text-muted)]">
              Configure your multi-stream broadcasting
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/seller/settings/stream">
              <div className="flex items-center justify-between p-4 border border-[var(--border-default)] rounded-lg hover:bg-[var(--bg-raised)] transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                    <Store className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">Restream Configuration</p>
                    <p className="text-sm text-[var(--text-muted)]">
                      Set up Restream.io to broadcast to multiple platforms
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)]" />
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
