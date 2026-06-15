"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClientSideSupabase, type PlatformConnection, type Seller } from '@/lib/supabase-client';
import { authFetch } from '@/lib/auth';
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
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      const response = await authFetch('/api/auth/me');
      if (!response.ok) {
        router.push('/login');
        return;
      }

      const data = await response.json();
      const isSeller = data.isSeller || false;
      const isAdmin = data.isAdmin || false;
      const sellerData = data.seller || null;

      if (!isSeller && !isAdmin) {
        router.push('/login');
        return;
      }

      if (!sellerData) {
        router.push('/signup');
        return;
      }

      setSeller(sellerData);
      setEmail(sellerData.email || '');

      const supabase = createClientSideSupabase();
      const { data: connectionData, error: connectionError } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('seller_id', sellerData.id)
        .eq('platform', 'whatnot')
        .maybeSingle();

      if (connectionError) {
        console.error('Failed to load Whatnot connection:', connectionError.message || connectionError);
      }

      if (connectionData) {
        setConnection(connectionData);
        setUsername(connectionData.platform_username || '');
        setDisplayName(connectionData.metadata?.displayName || connectionData.platform_username || '');
        setEmail(connectionData.metadata?.email || sellerData.email || '');
      }
    } catch (err) {
      console.error('Error loading Whatnot setup:', err);
      setError('Failed to load Whatnot setup');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleConnect = async () => {
    if (!username || !displayName || !email || !accessToken) {
      setError('Username, display name, email, and access token are required to connect');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      const res = await fetch('/api/whatnot/seller-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, displayName, email, accessToken }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to connect Whatnot');
      }

      setSuccess('Whatnot connected successfully. Products will sync soon.');
      await loadData();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('Connect error:', error);
      setError(error.message || 'Failed to connect Whatnot');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connection || !confirm('Disconnect Whatnot?')) return;

    try {
      setIsDisconnecting(true);
      setError(null);
      setSuccess(null);

      const res = await fetch('/api/whatnot/disconnect', {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to disconnect Whatnot');
      }

      setSuccess('Whatnot disconnected successfully. You can reconnect using the auth connection flow.');
      await loadData();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('Disconnect error:', error);
      setError(error.message || 'Failed to disconnect Whatnot');
    } finally {
      setIsDisconnecting(false);
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

      setSuccess(`Products synced: ${data.successCount || 0}`);
      await loadData();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('Sync products error:', error);
      setError(error.message || 'Failed to sync products');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="container mx-auto py-10 px-4 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Connect Whatnot</h1>
        <p className="text-sm text-[var(--text-muted)] mt-2">
          Connect your Whatnot account so your seller products appear in the dashboard.
        </p>
      </div>

      {isLoading ? (
        <div className="min-h-[260px] flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-gray-500" />
        </div>
      ) : (
        <div className="space-y-6">
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
                    <p className="text-sm text-[var(--text-muted)]">Whatnot Username</p>
                    <p className="font-medium text-[var(--text-primary)]">{connection.platform_username || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">Status</p>
                    <Badge className="bg-green-500 text-white">Connected</Badge>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button onClick={handleSyncProducts} disabled={isSyncing || isDisconnecting}>
                    {isSyncing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      'Sync Whatnot Products'
                    )}
                  </Button>
                  <Button variant="destructive" onClick={handleDisconnect} disabled={isDisconnecting || isSyncing || isSubmitting}>
                    {isDisconnecting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Disconnecting...
                      </>
                    ) : (
                      'Disconnect'
                    )}
                  </Button>
                </div>

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
                    <Label htmlFor="username">Whatnot Username</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="yourwhatnotname"
                    />
                  </div>

                  <div>
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your Store Name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="accessToken">Whatnot Access Token</Label>
                    <Input
                      id="accessToken"
                      type="text"
                      value={accessToken}
                      onChange={(e) => setAccessToken(e.target.value)}
                      placeholder="Enter your Whatnot bearer token"
                    />
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Use a real Whatnot access token for production sync. Demo tokens are not accepted.
                    </p>
                    <div className="mt-3 text-xs rounded-md bg-blue-50 p-2 border border-blue-200 text-blue-900">
                      <p className="font-semibold mb-1">Getting Your Token:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Your Whatnot account must be enrolled in the Seller API program</li>
                        <li>Generate a bearer token from your Whatnot Developer Dashboard</li>
                        <li>If you get a 401 error, verify the token has not expired</li>
                        <li>Contact Whatnot support if your account is not API-enabled</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button onClick={handleConnect} disabled={isSubmitting || !username || !displayName || !email || !accessToken}>
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
      )}
    </div>
  );
}
