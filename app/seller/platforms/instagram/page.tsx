'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClientSideSupabase, type PlatformConnection, type Seller } from '@/lib/supabase-client';
import { checkUserStatus } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, ChevronRight, ChevronLeft, DollarSign, Video, Info, Smartphone, AlertCircle, ArrowLeft, ExternalLink } from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Instagram Account', description: 'Business or Creator account' },
  { id: 2, title: 'Enable Live', description: 'Check live access' },
  { id: 3, title: 'Shopping', description: 'Connect products' },
  { id: 4, title: 'Commission', description: 'Understand earnings' },
  { id: 5, title: 'Go Live', description: 'Start streaming' },
];

export default function InstagramSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [connection, setConnection] = useState<PlatformConnection | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    accessToken: '',
    followerCount: '',
    step2Complete: false,
    step3Complete: false,
    step4Complete: false,
    step5Complete: false,
  });

  useEffect(() => {
    // Check for OAuth callback
    const callbackError = searchParams.get('error');
    const callbackSuccess = searchParams.get('success');
    const autoSync = searchParams.get('autoSync');

    if (callbackError) {
      setError(`Instagram OAuth error: ${callbackError}`);
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
      if (!user) { router.push('/login'); return; }
      const { data: sellerData } = await supabase.from('sellers').select('*').eq('user_id', user.id).maybeSingle();
      
      // Check if user is admin (admins can access without seller record)
      const { data: adminData } = await supabase.from('admins').select('id').eq('user_id', user.id).maybeSingle();
      
      if (!sellerData && !adminData) { router.push('/signup'); return; }
      setSeller(sellerData);
      
      // Only fetch connections if seller exists
      if (sellerData) {
        const { data: connectionData } = await supabase.from('platform_connections').select('*').eq('seller_id', sellerData.id).eq('platform', 'instagram').maybeSingle();
      if (connectionData) {
        setConnection(connectionData);
        const metadata = connectionData.metadata || {};
        setFormData(prev => ({
          ...prev,
          accessToken: metadata.accessToken || connectionData.access_token || '',
          followerCount: metadata.followerCount || '',
          step2Complete: metadata.step2Complete || false,
          step3Complete: metadata.step3Complete || false,
          step4Complete: metadata.step4Complete || false,
          step5Complete: metadata.step5Complete || false,
        }));
        if (metadata.completedSteps) {
          setCurrentStep(metadata.completedSteps);
        }
      }
      }
    } catch (error) {
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const saveStep = async () => {
    if (!seller) return;
    setIsSaving(true);
    setError(null);
    try {
      const supabase = createClientSideSupabase();
      const saveData = {
        seller_id: seller.id,
        platform: 'instagram',
        platform_user_id: null,
        access_token: formData.accessToken || null,
        status: currentStep === 5 ? 'connected' : 'pending',
        metadata: {
          accessToken: formData.accessToken,
          followerCount: formData.followerCount,
          step2Complete: formData.step2Complete,
          step3Complete: formData.step3Complete,
          step4Complete: formData.step4Complete,
          step5Complete: formData.step5Complete,
          completedSteps: currentStep,
          status: currentStep === 5 ? 'connected' : 'pending',
        },
      };
      
      let result;
      if (connection) {
        result = await supabase.from('platform_connections').update(saveData).eq('id', connection.id);
      } else {
        result = await supabase.from('platform_connections').insert(saveData).select().single();
      }
      
      if (!result) {
        throw new Error('No response from database');
      }
      
      if (result.error) {
        console.error('Supabase error details:', result.error);
        throw new Error(result.error.message || result.error.code || 'Database error occurred');
      }
      
      if (!connection && result.data) {
        setConnection(result.data);
      }
      
      if (currentStep < 5) setCurrentStep(currentStep + 1);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('Error saving step:', err);
      setError(err.message || 'Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAuthConnect = async () => {
    setError(null);
    try {
      const response = await fetch('/api/instagram/auth', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok || !data.authUrl) {
        throw new Error(data.error || 'Failed to get Instagram auth URL');
      }

      // Open popup for OAuth
      const width = 600;
      const height = 700;
      const left = (window.innerWidth - width) / 2;
      const top = (window.innerHeight - height) / 2;
      
      const popup = window.open(
        data.authUrl,
        'instagram-auth',
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
      const message = error instanceof Error ? error.message : 'Failed to initiate Instagram OAuth';
      console.error('Auth error:', error);
      setError(message);
    }
  };

  const handleSyncProducts = async () => {
    if (!connection || !seller) return;
    setIsSyncing(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/instagram/sync-products?sellerId=${seller.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
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

      setSuccess(`✓ ${data.syncedCount} products synced successfully from Instagram`);
    } catch (error: any) {
      console.error('Error syncing products:', error);
      setError(error?.message || 'Failed to sync products.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connection || !confirm('Disconnect Instagram?')) return;

    try {
      setIsDisconnecting(true);
      setError(null);

      const supabase = createClientSideSupabase();
      const { error } = await supabase
        .from('platform_connections')
        .delete()
        .eq('id', connection.id);

      if (error) throw error;

      setConnection(null);
      setCurrentStep(1);
      setFormData({
        accessToken: '',
        followerCount: '',
        step2Complete: false,
        step3Complete: false,
        step4Complete: false,
        step5Complete: false,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('Disconnect error:', err);
      setError(err.message || 'Failed to disconnect');
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
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
            <div className="p-3 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 rounded-lg text-white">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-2xl">Instagram Shop</CardTitle>
              <CardDescription>Connect your Instagram Shop so products can sync into your dashboard.</CardDescription>
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
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-purple-700 font-medium">
                  <CheckCircle className="w-5 h-5" />
                  Instagram Shop Connected
                </div>
                <p className="text-sm text-purple-700 mt-2">Account: {connection.platform_username || connection.metadata?.pageName || 'Authenticated'}</p>
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
              <label className="block text-sm font-medium mb-2">Instagram Access Token</label>
              <Input
                type="password"
                placeholder="Paste your Instagram API access token"
                value={formData.accessToken}
                onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">Use an access token to connect Instagram Shop via auth instead of username or page details.</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={handleAuthConnect} variant="outline" className="gap-2">
              <Smartphone className="w-4 h-4" />
              Authorize with Instagram
            </Button>
            <Button onClick={saveStep} disabled={isSaving || (!formData.accessToken && !connection?.access_token)}>
              {isSaving ? 'Saving...' : connection ? 'Update Connection' : 'Connect Instagram Shop'}
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
