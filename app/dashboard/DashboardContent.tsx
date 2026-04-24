'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClientSideSupabase, type Seller, type Product, type Sale } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DollarSign, Package, CreditCard, Video, AlertCircle, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSales: 0,
    totalRevenue: 0,
    pendingPayout: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Stream config state
  const [streamUrl, setStreamUrl] = useState('');
  const [schedule, setSchedule] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);

  const onboardingSuccess = searchParams.get('onboarding') === 'success';
  const onboardingRefresh = searchParams.get('onboarding') === 'refresh';

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Check Stripe account status directly when returning from onboarding
  useEffect(() => {
    if (onboardingSuccess || onboardingRefresh) {
      const checkStatus = async () => {
        try {
          const response = await fetch('/api/stripe/check-account-status');
          const data = await response.json();
          
          if (data.isActive) {
            // Update local seller state
            setSeller(prev => prev ? { ...prev, stripe_onboarding_status: 'active' } : null);
            setShowOnboarding(false);
            // Clear query params without full reload
            window.history.replaceState({}, '', '/dashboard');
          }
        } catch (err) {
          console.error('Failed to check account status:', err);
        }
      };

      checkStatus();
    }
  }, [onboardingSuccess, onboardingRefresh]);

  const loadDashboardData = async () => {
    try {
      const supabase = createClientSideSupabase();

      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      // Check if user is admin
      const { data: adminData } = await supabase
        .from('admins')
        .select('id')
        .eq('user_id', session.user.id)
        .single();
      setIsAdmin(!!adminData);

      // Get seller data
      const { data: sellerData } = await supabase
        .from('sellers')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (!sellerData) {
        router.push('/signup');
        return;
      }

      setSeller(sellerData);

      // Populate stream config fields
      setStreamUrl(sellerData.stream_embed_url || '');
      setSchedule(sellerData.schedule_text || '');

      // Check if Stripe onboarding needed
      if (!sellerData.stripe_account_id || sellerData.stripe_onboarding_status !== 'active') {
        setShowOnboarding(true);
      }

      // Get products
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', sellerData.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setProducts(productsData || []);

      // Get sales
      const { data: salesData } = await supabase
        .from('sales')
        .select('*')
        .eq('seller_id', sellerData.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setSales(salesData || []);

      // Calculate stats
      const { count: productCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', sellerData.id);

      const { data: allSales } = await supabase
        .from('sales')
        .select('amount, platform_fee, status')
        .eq('seller_id', sellerData.id)
        .eq('status', 'completed');

      const totalRevenue = allSales?.reduce((sum, sale) => sum + (sale.amount - sale.platform_fee), 0) || 0;

      setStats({
        totalProducts: productCount || 0,
        totalSales: allSales?.length || 0,
        totalRevenue,
        pendingPayout: totalRevenue,
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStripeOnboarding = async () => {
    try {
      const response = await fetch('/api/stripe/connect-onboarding', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('Failed to get onboarding URL');
      }
    } catch (error) {
      console.error('Onboarding error:', error);
    }
  };

  const handleSaveStreamConfig = async () => {
    setSavingConfig(true);
    setConfigSaved(false);

    try {
      const response = await fetch('/api/seller/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streamEmbedUrl: streamUrl,
          scheduleText: schedule,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setConfigSaved(true);
        // Update local seller state
        setSeller(prev => prev ? { ...prev, stream_embed_url: streamUrl, schedule_text: schedule } : null);
        setTimeout(() => setConfigSaved(false), 3000);
      } else {
        console.error('Failed to save config:', data.error);
      }
    } catch (error) {
      console.error('Save config error:', error);
    } finally {
      setSavingConfig(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Seller Dashboard</h1>
          <div className="flex gap-4">
            {isAdmin && (
              <Link href="/admin">
                <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                  Switch to Admin
                </Button>
              </Link>
            )}
            <Link href="/dashboard/products">
              <Button variant="outline">Manage Products</Button>
            </Link>
            <Button onClick={async () => {
              await createClientSideSupabase().auth.signOut();
              router.push('/login');
            }} variant="outline">Log Out</Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Alerts */}
        {onboardingSuccess && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle>Stripe Onboarding Complete</AlertTitle>
            <AlertDescription>
              Your payment account is now active. You can start receiving payments!
            </AlertDescription>
          </Alert>
        )}

        {seller?.approval_status === 'pending' && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Account Pending Approval</AlertTitle>
            <AlertDescription>
              Your seller account is pending admin approval. You can upload products but cannot go live until approved.
            </AlertDescription>
          </Alert>
        )}

        {showOnboarding && !onboardingSuccess && (
          <Alert className="mb-6" variant="destructive">
            <CreditCard className="h-4 w-4" />
            <AlertTitle>Complete Stripe Onboarding</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <p>You need to complete Stripe Connect onboarding to receive payments.</p>
              <Button onClick={handleStripeOnboarding} size="sm" className="w-fit">
                Complete Onboarding
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSales}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payout Status</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {seller?.stripe_onboarding_status === 'active' ? 'Active' : 'Pending'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Go Live Button */}
        {seller?.approval_status === 'approved' && seller?.stripe_onboarding_status === 'active' && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-100 rounded-full">
                    <Video className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Ready to Go Live?</h3>
                    <p className="text-sm text-gray-600">Start your live stream and sell to customers in real-time.</p>
                  </div>
                </div>
                <Link href={`/live/${seller.id}`}>
                  <Button size="lg" className="bg-red-600 hover:bg-red-700">
                    Go Live
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stream Configuration */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Live Stream Setup</CardTitle>
            <CardDescription>Configure your stream embed and schedule</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="streamUrl">Stream Embed URL</Label>
              <Input
                id="streamUrl"
                placeholder="https://restream.io/embed/... or TikTok Live URL"
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Paste your Restream embed URL or TikTok Live link
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule">Stream Schedule</Label>
              <Input
                id="schedule"
                placeholder="e.g., Monday, Wednesday, Friday at 8 PM EST"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleSaveStreamConfig} 
              disabled={savingConfig}
              className="w-fit"
            >
              {savingConfig ? 'Saving...' : 'Save Configuration'}
            </Button>
            {configSaved && (
              <p className="text-sm text-green-600">Configuration saved successfully!</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Products */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Recent Products</CardTitle>
            <CardDescription>Your recently uploaded products</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500">
                      No products yet.{' '}
                      <Link href="/dashboard/products" className="text-blue-600 hover:underline">
                        Upload your first product
                      </Link>
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>${product.price.toFixed(2)}</TableCell>
                      <TableCell>{product.stock_quantity}</TableCell>
                      <TableCell>{getStatusBadge(product.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
            <CardDescription>Your recent transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500">
                      No sales yet. Complete onboarding and start selling!
                    </TableCell>
                  </TableRow>
                ) : (
                  sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">{sale.product_id?.slice(0, 8)}...</TableCell>
                      <TableCell>${sale.amount.toFixed(2)}</TableCell>
                      <TableCell>{new Date(sale.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{getStatusBadge(sale.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
