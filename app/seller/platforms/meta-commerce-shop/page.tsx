'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { type PlatformConnection, type Seller, createClientSideSupabase } from '@/lib/supabase-client';
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
  const [isValidating, setIsValidating] = useState(false);
  const [isAutoReauth, setIsAutoReauth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    accessToken: '',
  });
  const [directToken, setDirectToken] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

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

  const validateConnection = async (conn: PlatformConnection) => {
    if (!conn) return;
    
    setIsValidating(true);
    try {
      const response = await fetch('/api/meta/validate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId: conn.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Validation error:', data.error);
        return;
      }

      if (!data.valid) {
        console.log('Token invalid, attempting refresh...');
        
        // Try to refresh the token
        const refreshResponse = await fetch('/api/meta/refresh-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ connectionId: conn.id }),
        });

        const refreshData = await refreshResponse.json();

        if (refreshData.success) {
          console.log('Token refreshed successfully');
          setSuccess('Meta connection refreshed and validated successfully.');
          
          // Reload connection to get updated token
          const dbClient = createClientSideSupabase();
          const { data: updatedConnection } = await dbClient
            .from('platform_connections')
            .select('*')
            .eq('id', conn.id)
            .single();

          if (updatedConnection) {
            setConnection(updatedConnection);
          }
        } else if (refreshData.needsReauth) {
          console.log('Token refresh failed, needs re-authorization');
          setError('Your Meta authorization has expired. Please re-authorize to continue.');
          
          // Auto-trigger re-authorization after a short delay
          setIsAutoReauth(true);
          setTimeout(() => {
            handleAuthConnect();
            setIsAutoReauth(false);
          }, 2000);
        } else {
          console.error('Token refresh failed:', refreshData.error);
          setError(`Token validation failed: ${refreshData.error}`);
        }
      } else {
        console.log('Token is valid');
        setSuccess('Meta connection is active and validated.');
      }
    } catch (error) {
      console.error('Error validating connection:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/me', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) { 
        console.error('Auth check failed:', res.status);
        router.push('/login'); 
        return; 
      }
      const userData = await res.json();
      if (!userData.id) { 
        console.error('No user data found');
        router.push('/login'); 
        return; 
      }
      const dbClient = createClientSideSupabase();
      const { data: sellerData, error: sellerError } = await dbClient.from('sellers').select('*').eq('id', userData.id).maybeSingle();
      
      if (sellerError) {
        console.error('Error fetching seller:', sellerError);
      }
      
      console.log('Seller data:', sellerData);
      setSeller(sellerData);

      if (sellerData) {
        console.log('loadData: Seller found, seller.id:', sellerData.id);
        
        // Use API endpoint to get connection (bypasses RLS)
        const connectionRes = await fetch('/api/facebook/get-connection', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        
        console.log('loadData: Connection response status:', connectionRes.status);
        
        if (connectionRes.ok) {
          const connectionData = await connectionRes.json();
          console.log('loadData: Meta connection from API:', connectionData.connection);
          
          if (connectionData.connection) {
            console.log('loadData: Setting connection state');
            setConnection(connectionData.connection);
            setFormData({
              accessToken: '',
            });
            setSuccess('Meta Commerce Shop connected successfully.');
            
            // Auto-validate the connection
            validateConnection(connectionData.connection);
            setIsLoading(false);
            return;
          }
        } else {
          console.error('loadData: Error fetching connection from API:', connectionRes.status);
          const errorData = await connectionRes.json();
          console.error('loadData: Error data:', errorData);
        }

        // No connection found from API, clear connection state
        console.log('loadData: No connection found, clearing state');
        setConnection(null);
        setSuccess(null);
        console.log('No Meta connection found, connection state cleared');

        // Try to load existing facebook or instagram connection and migrate it to meta
        const { data: fbConnection } = await dbClient
          .from('platform_connections')
          .select('*')
          .eq('seller_id', sellerData.id)
          .eq('platform', 'facebook')
          .maybeSingle();

        const { data: instaConnection } = await dbClient
          .from('platform_connections')
          .select('*')
          .eq('seller_id', sellerData.id)
          .eq('platform', 'instagram')
          .maybeSingle();

        console.log('FB connection:', fbConnection);
        console.log('Instagram connection:', instaConnection);

        // Migrate facebook connection to meta
        if (fbConnection) {
          const migrated = await dbClient
            .from('platform_connections')
            .update({ platform: 'meta' })
            .eq('id', fbConnection.id)
            .select()
            .single();
          if (migrated.data) {
            setConnection(migrated.data);
            setFormData({ accessToken: '' });
            setSuccess('Meta Commerce Shop connected successfully.');
            validateConnection(migrated.data);
          }
        }
        // Migrate instagram connection to meta
        else if (instaConnection) {
          const migrated = await dbClient
            .from('platform_connections')
            .update({ platform: 'meta' })
            .eq('id', instaConnection.id)
            .select()
            .single();
          if (migrated.data) {
            setConnection(migrated.data);
            setFormData({ accessToken: '' });
            setSuccess('Meta Commerce Shop connected successfully.');
            validateConnection(migrated.data);
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
    
    // If no token is present, trigger OAuth flow instead
    if (!formData.accessToken && !connection?.access_token) {
      handleAuthConnect();
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/seller/platform-connections/meta', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          accessToken: formData.accessToken || connection?.access_token || null,
          connectionId: connection?.id || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save connection');
      }

      if (data.connection) {
        setConnection(data.connection);
        setSuccess('Meta Commerce Shop connected successfully.');
        setFormData({ accessToken: '' });
      }
    } catch (error: any) {
      console.error('Error saving Meta Commerce Shop connection:', error);
      setError(error?.message || 'Failed to save connection.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAuthConnect = async () => {
    console.log('handleAuthConnect called');
    
    // Check if already connected to prevent unnecessary OAuth
    if (connection) {
      console.log('Already connected, skipping OAuth');
      setSuccess('Meta Commerce Shop is already connected.');
      return;
    }
    
    setError(null);
    try {
      console.log('Fetching auth URL from /api/facebook/auth');
      
      // Get JWT token from localStorage
      const token = localStorage.getItem('token');
      console.log('JWT token present:', !!token);
      
      if (!token) {
        throw new Error('You must be logged in to connect with Meta');
      }
      
      const response = await fetch('/api/facebook/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok || !data.authUrl) {
        throw new Error(data.error || 'Failed to get Meta auth URL');
      }

      console.log('Redirecting to Meta OAuth');
      // Use redirect instead of popup to avoid browser blocking
      window.location.href = data.authUrl;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to initiate Meta OAuth';
      console.error('Auth error:', error);
      setError(message);
    }
  };

  const handleDirectTokenConnect = async () => {
    console.log('handleDirectTokenConnect called');
    
    if (!formData.accessToken.trim()) {
      setError('Please enter your Meta access token');
      return;
    }
    
    setError(null);
    setIsConnecting(true);
    
    try {
      // Get JWT token from localStorage
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('You must be logged in to connect with Meta');
      }
      
      const response = await fetch('/api/facebook/connect-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ accessToken: formData.accessToken }),
      });

      const data = await response.json();
      console.log('Direct connect response:', data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect with Meta');
      }
      
      // Clear form and show success
      setFormData({ accessToken: '' });
      setSuccess('Meta connected successfully!');
      
      // Force reload connection data from database
      console.log('Reloading connection data from database...');
      await loadData();
      
      console.log('Connection data reloaded');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to connect with Meta';
      console.error('Direct token connect error:', error);
      setError(message);
    } finally {
      setIsConnecting(false);
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

  const handleReauthorize = async () => {
    handleAuthConnect();
  };

  const handleSyncProducts = async () => {
    if (!connection || !seller) return;
    setIsSyncing(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/facebook/sync-products', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log('Sync products response:', data);

      if (!response.ok) {
        console.error('Full error response:', data);
        throw new Error(data.error || 'Failed to sync products');
      }

      // Reload connection using API to get updated sync timestamp
      const connectionRes = await fetch('/api/facebook/get-connection', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      if (connectionRes.ok) {
        const connectionData = await connectionRes.json();
        if (connectionData.connection) {
          setConnection(connectionData.connection);
        }
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
              {isAutoReauth && (
                <Alert>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <AlertDescription>Automatically re-authorizing your Meta connection...</AlertDescription>
                </Alert>
              )}
              {isValidating && (
                <Alert>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <AlertDescription>Validating your Meta connection...</AlertDescription>
                </Alert>
              )}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-700 font-medium">
                  <CheckCircle className="w-5 h-5" />
                  Meta Commerce Shop Connected
                </div>
                <p className="text-sm text-blue-700 mt-2">Account: {connection.platform_username || connection.metadata?.pageName || 'Authenticated'}</p>
                <p className="text-sm text-gray-600">Last sync: {connection.metadata?.last_product_sync_at ? new Date(connection.metadata.last_product_sync_at).toLocaleString() : 'Never'}</p>
                {connection.metadata?.last_validated_at && (
                  <p className="text-sm text-gray-600">Last validated: {new Date(connection.metadata.last_validated_at).toLocaleString()}</p>
                )}
                {connection.metadata?.last_refreshed_at && (
                  <p className="text-sm text-green-600">Token refreshed: {new Date(connection.metadata.last_refreshed_at).toLocaleString()}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Button variant="secondary" onClick={handleSyncProducts} disabled={isSyncing}>
                  {isSyncing ? 'Syncing...' : 'Sync Products'}
                </Button>
                <Button variant="outline" onClick={handleReauthorize} className="gap-2">
                  <MetaIcon className="w-4 h-4" />
                  Reauthorize
                </Button>
                <Button variant="destructive" onClick={handleDisconnect}>
                  Disconnect
                </Button>
              </div>
            </div>
          ) : null}

          {!connection && (
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
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            {!connection && (
              <Button onClick={handleDirectTokenConnect} disabled={isConnecting} className="gap-2">
                {isConnecting ? 'Connecting...' : 'Connect with Token'}
              </Button>
            )}
            {!connection && (
              <Button onClick={handleAuthConnect} variant="outline" className="gap-2">
                <MetaIcon className="w-4 h-4" />
                Authorize with Meta
              </Button>
            )}
            <Link href="https://business.facebook.com/commerce" target="_blank" className="inline-flex items-center justify-center gap-2 text-sm text-blue-600 hover:underline">
              <ExternalLink className="w-4 h-4" />
              Meta Commerce Manager
            </Link>
          </div>

          {!connection && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-blue-800 font-medium mb-2">Need help with authorization?</p>
              <p className="text-sm text-blue-700 mb-2">If you see a domain error during authorization, you can use the manual access token method instead:</p>
              <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
                <li>Go to <Link href="https://developers.facebook.com/tools/explorer/" target="_blank" className="text-blue-600 hover:underline">Facebook Graph API Explorer</Link></li>
                <li>Select your app and generate a short-lived access token</li>
                <li>Paste the token in the field above and click "Connect Meta Commerce Shop"</li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
