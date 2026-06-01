'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClientSideSupabase, type PlatformConnection, type Seller } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, ArrowLeft, ExternalLink } from 'lucide-react';

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

export default function FacebookShopPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [connection, setConnection] = useState<PlatformConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    accessToken: '',
  });

  useEffect(() => {
    // Check for OAuth callback
    const callbackError = searchParams.get('error');
    const callbackSuccess = searchParams.get('success');
    const autoSync = searchParams.get('autoSync');

    if (callbackError) {
      setError(`Facebook OAuth error: ${callbackError}`);
    }

    loadData().then(() => {
      if (callbackSuccess) {
        setSuccess(callbackSuccess);
        // Auto-sync products if requested and connection exists
        if (autoSync === 'true') {
          setTimeout(() => {
            handleSyncProducts();
          }, 1000);
        }
      }
    });
  }, []);

  const loadData = async () => {
    try {
      const supabase = createClientSideSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: sellerData } = await supabase
        .from('sellers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      const { data: adminData } = await supabase
        .from('admins')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!sellerData && !adminData) {
        router.push('/signup');
        return;
      }

      setSeller(sellerData);

      if (sellerData) {
        const { data: connectionData } = await supabase
          .from('platform_connections')
          .select('*')
          .eq('seller_id', sellerData.id)
          .eq('platform', 'facebook')
          .maybeSingle();

        if (connectionData) {
          setConnection(connectionData);
          setFormData({
            accessToken: '',
          });
        }
      }
    } catch (error) {
      console.error('Failed to load Facebook Shop:', error);
      setError('Failed to load Facebook Shop connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!seller) return;
    if (!formData.accessToken && !connection?.access_token) {
      setError('Facebook access token is required to connect.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = createClientSideSupabase();
      const record = {
        seller_id: seller.id,
        platform: 'facebook',
        status: 'connected',
        platform_username: null,
        platform_user_id: null,
        access_token: formData.accessToken || connection?.access_token || null,
        metadata: {
          access_token: formData.accessToken || connection?.access_token || null,
          last_product_sync_at: connection?.metadata?.last_product_sync_at || null,
        },
        connected_at: connection?.connected_at || new Date().toISOString(),
      };

      let result;
      if (connection) {
        result = await supabase
          .from('platform_connections')
          .update(record)
          .eq('id', connection.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('platform_connections')
          .insert(record)
          .select()
          .single();
      }

      if (result.error) throw result.error;
      if (result.data) {
        setConnection(result.data);
        setSuccess('Facebook Shop connected successfully.');
      }
    } catch (error: any) {
      console.error('Error saving Facebook Shop connection:', error);
      setError(error?.message || 'Failed to save connection.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAuthConnect = async () => {
    setError(null);
    try {
      const response = await fetch('/api/facebook/auth', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok || !data.authUrl) {
        throw new Error(data.error || 'Failed to get Facebook auth URL');
      }

      // Open popup for OAuth
      const width = 600;
      const height = 700;
      const left = (window.innerWidth - width) / 2;
      const top = (window.innerHeight - height) / 2;
      
      const popup = window.open(
        data.authUrl,
        'facebook-auth',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );

      // Poll for popup closure
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          // Reload data to check if connection was established
          loadData();
        }
      }, 1000);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to initiate Facebook OAuth';
      console.error('Auth error:', error);
      setError(message);
    }
  };

  const handleDisconnect = async () => {
    if (!connection || !confirm('Disconnect Facebook Shop?')) return;
    setError(null);
    setSuccess(null);

    try {
      const supabase = createClientSideSupabase();
      const { error } = await supabase
        .from('platform_connections')
        .delete()
        .eq('id', connection.id);

      if (error) throw error;
      setConnection(null);
      setFormData({ accessToken: '' });
      setSuccess('Facebook Shop disconnected.');
    } catch (error: any) {
      console.error('Error disconnecting Facebook Shop:', error);
      setError(error?.message || 'Failed to disconnect.');
    }
  };

  const handleSyncProducts = async () => {
    if (!connection || !seller) return;
    setIsSyncing(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/facebook/sync-products?sellerId=${seller.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Full error response:', data);
        throw new Error(data.error || 'Failed to sync products');
      }

      // Reload connection to get updated sync timestamp
      const supabase = createClientSideSupabase();
      const { data: updatedConnection } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('id', connection.id)
        .single();

      if (updatedConnection) {
        setConnection(updatedConnection);
      }

      setSuccess(`✓ ${data.syncedCount} products synced successfully from Facebook`);
    } catch (error: any) {
      console.error('Error syncing products:', error);
      setError(error?.message || 'Failed to sync products.');
    } finally {
      setIsSyncing(false);
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
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <Link href="/seller/platforms" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Platforms
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-lg text-white">
              <FacebookIcon className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-2xl">Facebook Shop</CardTitle>
              <CardDescription>Connect your Facebook Shop so products can sync into your dashboard.</CardDescription>
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
            <Alert>
              <CheckCircle className="w-4 h-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {connection ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-700 font-medium">
                  <CheckCircle className="w-5 h-5" />
                  Facebook Shop Connected
                </div>
                <p className="text-sm text-blue-700 mt-2">Page: {connection.platform_username || connection.metadata?.pageName || 'Authenticated'}</p>
                <p className="text-sm text-gray-600">Last sync: {connection.metadata?.last_product_sync_at ? new Date(connection.metadata.last_product_sync_at).toLocaleString() : 'Never'}</p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Button variant="secondary" onClick={handleSyncProducts} disabled={isSyncing}>
                  {isSyncing ? 'Syncing...' : 'Sync Products'}
                </Button>
                <Button variant="destructive" onClick={handleDisconnect}>
                  Disconnect Shop
                </Button>
              </div>
            </div>
          ) : null}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Facebook Access Token</label>
              <Input
                type="password"
                placeholder="Paste your Facebook API access token"
                value={formData.accessToken}
                onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">Use an access token to connect Facebook Shop via auth instead of username or page details.</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={handleAuthConnect} variant="outline" className="gap-2">
              <FacebookIcon className="w-4 h-4" />
              Authorize with Facebook
            </Button>
            <Button onClick={handleSave} disabled={isSaving || (!formData.accessToken && !connection?.access_token)}>
              {isSaving ? 'Saving...' : connection ? 'Update Connection' : 'Connect Facebook Shop'}
            </Button>
            <Link href="https://business.facebook.com/commerce" target="_blank" className="inline-flex items-center justify-center gap-2 text-sm text-blue-600 hover:underline">
              <ExternalLink className="w-4 h-4" />
              Facebook Commerce Manager
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
