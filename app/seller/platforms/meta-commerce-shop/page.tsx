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

function MetaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
    </svg>
  );
}

export default function MetaCommerceShopPage() {
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
      setError(`Meta OAuth error: ${callbackError}`);
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
        // Try to load existing facebook or instagram connection and migrate it to meta
        const { data: fbConnection } = await supabase
          .from('platform_connections')
          .select('*')
          .eq('seller_id', sellerData.id)
          .eq('platform', 'facebook')
          .maybeSingle();

        const { data: instaConnection } = await supabase
          .from('platform_connections')
          .select('*')
          .eq('seller_id', sellerData.id)
          .eq('platform', 'instagram')
          .maybeSingle();

        const { data: metaConnection } = await supabase
          .from('platform_connections')
          .select('*')
          .eq('seller_id', sellerData.id)
          .eq('platform', 'meta')
          .maybeSingle();

        // If meta connection exists, use it
        if (metaConnection) {
          setConnection(metaConnection);
          setFormData({
            accessToken: '',
          });
        }
        // Otherwise migrate facebook or instagram connection to meta
        else if (fbConnection) {
          const migrated = await supabase
            .from('platform_connections')
            .update({ platform: 'meta' })
            .eq('id', fbConnection.id)
            .select()
            .single();
          if (migrated.data) {
            setConnection(migrated.data);
            setFormData({ accessToken: '' });
          }
        }
        else if (instaConnection) {
          const migrated = await supabase
            .from('platform_connections')
            .update({ platform: 'meta' })
            .eq('id', instaConnection.id)
            .select()
            .single();
          if (migrated.data) {
            setConnection(migrated.data);
            setFormData({ accessToken: '' });
          }
        }
      }
    } catch (error) {
      console.error('Failed to load Meta Commerce Shop:', error);
      setError('Failed to load Meta Commerce Shop connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!seller) return;
    if (!formData.accessToken && !connection?.access_token) {
      setError('Meta access token is required to connect.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = createClientSideSupabase();
      const record = {
        seller_id: seller.id,
        platform: 'meta',
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
        setSuccess('Meta Commerce Shop connected successfully.');
      }
    } catch (error: any) {
      console.error('Error saving Meta Commerce Shop connection:', error);
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
        throw new Error(data.error || 'Failed to get Meta auth URL');
      }

      // Open popup for OAuth
      const width = 600;
      const height = 700;
      const left = (window.innerWidth - width) / 2;
      const top = (window.innerHeight - height) / 2;
      
      const popup = window.open(
        data.authUrl,
        'meta-auth',
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
      const message = error instanceof Error ? error.message : 'Failed to initiate Meta OAuth';
      console.error('Auth error:', error);
      setError(message);
    }
  };

  const handleDisconnect = async () => {
    if (!connection || !confirm('Disconnect Meta Commerce Shop?')) return;
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
      setSuccess('Meta Commerce Shop disconnected.');
    } catch (error: any) {
      console.error('Error disconnecting Meta Commerce Shop:', error);
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

      setSuccess(`✓ ${data.syncedCount} products synced successfully from Meta Commerce Shop`);
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
            <div className="p-3 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-lg text-white">
              <MetaIcon className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-2xl">Meta Commerce Shop</CardTitle>
              <CardDescription>Connect your Meta Commerce Shop (Facebook & Instagram) so products can sync into your dashboard.</CardDescription>
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
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-700 font-medium">
                  <CheckCircle className="w-5 h-5" />
                  Meta Commerce Shop Connected
                </div>
                <p className="text-sm text-blue-700 mt-2">Account: {connection.platform_username || connection.metadata?.pageName || 'Authenticated'}</p>
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
              <label className="block text-sm font-medium mb-2">Meta Access Token</label>
              <Input
                type="password"
                placeholder="Paste your Meta API access token"
                value={formData.accessToken}
                onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">Use an access token to connect Meta Commerce Shop via auth.</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={handleAuthConnect} variant="outline" className="gap-2">
              <MetaIcon className="w-4 h-4" />
              Authorize with Meta
            </Button>
            <Button onClick={handleSave} disabled={isSaving || (!formData.accessToken && !connection?.access_token)}>
              {isSaving ? 'Saving...' : connection ? 'Update Connection' : 'Connect Meta Commerce Shop'}
            </Button>
            <Link href="https://business.facebook.com/commerce" target="_blank" className="inline-flex items-center justify-center gap-2 text-sm text-blue-600 hover:underline">
              <ExternalLink className="w-4 h-4" />
              Meta Commerce Manager
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
