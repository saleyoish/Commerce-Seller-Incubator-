"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientSideSupabase, type PlatformConnection, type Seller } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle } from 'lucide-react';

export default function WhatnotSetupPage() {
  const router = useRouter();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [connection, setConnection] = useState<PlatformConnection | null>(null);
  const [accessToken, setAccessToken] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedCount, setSyncedCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadData();
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

      // Check if user is admin (admins can access without seller record)
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

      // Check for existing connection (only if seller exists)
      if (sellerData) {
        const { data: connectionData } = await supabase
          .from('platform_connections')
          .select('*')
          .eq('seller_id', sellerData.id)
          .eq('platform', 'whatnot')
          .maybeSingle();

        if (connectionData) {
          setConnection(connectionData);
        }

        const { data: syncedData, count: syncedCountResult, error: syncedCountError } = await supabase
          .from('whatnot_products')
          .select('id', { count: 'exact' })
          .eq('seller_id', sellerData.id);

        if (!syncedCountError) {
          setSyncedCount(syncedCountResult ?? 0);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!seller || !accessToken) {
      setError('Access token is required to connect Whatnot');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      const res = await fetch('/api/whatnot/seller-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to connect Whatnot');
      }

      setSuccess('Whatnot connected successfully. Products will sync soon.');
      await loadData();
    } catch (err: any) {
      console.error('Connect error:', err);
      setError(err.message || 'Failed to connect Whatnot');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSyncProducts = async () => {
    if (!seller) return;

    try {
      setIsSyncing(true);
      setError(null);
      setSuccess(null);

      const res = await fetch(`/api/whatnot/sync-products?sellerId=${seller.id}&syncType=pull`, {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Product sync failed');
      }

      if (data.errors?.length > 0) {
        setError(Array.isArray(data.errors) ? data.errors.join('\n') : String(data.errors));
      }

      setSuccess(`Products synced: ${data.successCount || 0}`);
      await loadData();
    } catch (err: any) {
      console.error('Sync products error:', err);
      setError(err.message || 'Failed to sync products');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connection || !confirm('Disconnect Whatnot?')) return;

    try {
      setError(null);
      setSuccess(null);
      setIsSubmitting(true);

      const res = await fetch('/api/whatnot/disconnect', {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to disconnect Whatnot');
      }

      setSuccess('Whatnot disconnected. You can reconnect with a real token now.');
      await loadData();
    } catch (err: any) {
      console.error('Disconnect error:', err);
      setError(err.message || 'Failed to disconnect Whatnot');
    } finally {
      setIsSubmitting(false);
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
    <div className="container mx-auto py-10 px-4 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Connect Whatnot</h1>
        <p className="text-sm text-[var(--text-muted)] mt-2">
          Connect your Whatnot account so your seller products appear in the dashboard.
        </p>
        <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
          Products synced: {syncedCount ?? 0}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {connection?.status === 'connected' ? (
        <Card className="border border-green-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Whatnot Connected
            </CardTitle>
            <CardDescription>
              Your Whatnot account is connected. Sync products to see them in the seller dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-[var(--text-muted)]">Connection</p>
                <p className="font-medium text-[var(--text-primary)]">Authenticated via access token</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">Status</p>
                <Badge className="bg-green-500 text-white">Connected</Badge>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button onClick={handleSyncProducts} disabled={isSyncing}>
                {isSyncing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  'Sync Whatnot Products'
                )}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDisconnect}
                disabled={isSubmitting}
              >
                Disconnect
              </Button>
            </div>

            {connection.access_token === 'demo_token' ? (
              <div className="rounded-md border border-yellow-300 bg-yellow-100 p-4">
                <p className="text-sm text-yellow-900">
                  This connection is currently using demo mode. If you want live Whatnot products, disconnect and reconnect with a real Whatnot bearer token.
                </p>
              </div>
            ) : (
              <div className="rounded-md border border-green-300 bg-green-50 p-4">
                <p className="text-sm text-green-900">
                  Real Whatnot access token detected. Syncs will use the actual Whatnot API.
                </p>
              </div>
            )}

            <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4">
              <p className="text-sm text-gray-700">
                After sync completes, refresh your seller products page to view the imported items.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-slate-200">
          <CardHeader>
            <CardTitle>Connect Whatnot</CardTitle>
            <CardDescription>
              Enter your Whatnot details and connect your seller account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-4">
              <div>
                <Label htmlFor="accessToken">Whatnot API Token</Label>
                <Input
                  id="accessToken"
                  type="text"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="Paste your Whatnot bearer token here"
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Connect Whatnot using a valid access token instead of entering username details.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button onClick={handleConnect} disabled={isSubmitting || !accessToken}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect Whatnot'
                )}
              </Button>
              <Badge className="bg-blue-500 text-white">Real Whatnot Auth</Badge>
            </div>

            <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4">
              <p className="text-sm text-gray-700">
                This page creates a Whatnot connection record and triggers product sync.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-sm text-[var(--text-muted)]">
        <p>
          If your products do not appear immediately, refresh the dashboard after the sync finishes.
        </p>
      </div>
    </div>
  );
}
