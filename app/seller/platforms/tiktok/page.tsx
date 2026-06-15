'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClientSideSupabase, type PlatformConnection, type Seller } from '@/lib/supabase-client';
import { authFetch } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  RefreshCw
} from 'lucide-react';

export default function TikTokSetupPage() {
  const router = useRouter();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [connection, setConnection] = useState<PlatformConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await authFetch('/api/auth/me');
      if (!res.ok) { router.push('/login'); return; }
      const userData = await res.json();
      const { seller: sellerData, isAdmin } = userData;

      if (!sellerData && !isAdmin) { router.push('/signup'); return; }

      setSeller(sellerData);

      if (sellerData) {
        const supabaseClient = createClientSideSupabase();
        const { data: connectionData } = await supabaseClient
          .from('platform_connections')
          .select('*')
          .eq('seller_id', sellerData.id)
          .eq('platform', 'tiktok')
          .maybeSingle();
        if (connectionData) setConnection(connectionData);
      }
    } catch (error) {
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthConnect = async () => {
    if (!seller) return;

    setIsConnecting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/tiktok/connect', {
        method: 'POST',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate TikTok auth');
      }

      if (data.demoMode) {
        setSuccess('TikTok auth is not configured yet. Demo mode is active.');
        return;
      }

      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error('TikTok auth URL was not returned');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to connect TikTok');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connection || !confirm('Are you sure you want to disconnect TikTok Shop?')) return;

    try {
      const supabase = createClientSideSupabase();
      const { error } = await supabase
        .from('platform_connections')
        .delete()
        .eq('id', connection.id);

      if (error) throw error;

      setConnection(null);
      setSuccess('Disconnected successfully');
    } catch (error: any) {
      setError(error.message || 'Failed to disconnect');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Link href="/seller/platforms" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Platforms
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
              </svg>
            </div>
            <div>
              <CardTitle className="text-2xl">TikTok Shop</CardTitle>
              <CardDescription>
                {connection ? 'Manage your TikTok Shop connection' : 'Connect your TikTok Shop account'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-500 text-green-700">
              <CheckCircle className="w-4 h-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {connection && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Connected</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                Shop: {connection.platform_username || 'Unknown'}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Connect your TikTok Shop using OAuth so the platform can authenticate your account without manual username entry.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleAuthConnect}
              disabled={isConnecting}
              className="flex-1"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : connection ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reconnect TikTok Shop
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Connect TikTok Shop
                </>
              )}
            </Button>

            {connection && (
              <Button variant="destructive" onClick={handleDisconnect}>
                Disconnect
              </Button>
            )}
          </div>

          <div className="pt-4 border-t">
            <a 
              href="https://seller.tiktok.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-blue-600 hover:underline"
            >
              Open TikTok Seller Center
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
