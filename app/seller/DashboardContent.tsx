'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authFetch } from '@/lib/auth';
import { type Seller, type Product, type Sale } from '@/lib/supabase-client';
import { useAuth } from '@/context/AuthContext';
import { useStreamStatus } from '@/hooks/useStreamStatus';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DollarSign,
  Package,
  CreditCard,
  Video,
  AlertCircle,
  CheckCircle,
  LayoutDashboard,
  LogOut,
  ExternalLink,
  Loader2,
  Edit,
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingCart,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// Type for the partial sales data returned from the select query
type PartialSale = {
  amount: number;
  platform_fee: number;
  status: string;
  created_at: string;
  product_id?: string;
};

function DashboardContentInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [seller, setSeller] = useState<Seller | null>(null);
  const { streamStatus, isLoading: streamLoading } = useStreamStatus(seller?.id || '');
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [editingSale, setEditingSale] = useState<string | null>(null);
  const [streams, setStreams] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSales: 0,
    totalRevenue: 0,
    pendingPayout: 0,
  });

  // Chart data states
  const [salesData, setSalesData] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [productData, setProductData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user, loading } = useAuth();

  // Stream config state
  const [streamUrl, setStreamUrl] = useState('');
  const [schedule, setSchedule] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);

  const onboardingSuccess = searchParams.get('onboarding') === 'success';
  const onboardingRefresh = searchParams.get('onboarding') === 'refresh';

  useEffect(() => {
    if (loading) return;
    if (!user || (!user.isSeller && !user.isAdmin)) {
      router.push('/login');
      return;
    }
    loadDashboardData();
  }, [loading, user]);

  useEffect(() => {
    if (onboardingSuccess || onboardingRefresh) {
      const checkStatus = async () => {
        try {
          const response = await fetch('/api/stripe/check-account-status');
          const data = await response.json();
          if (data.isActive) {
            setSeller(prev => prev ? { ...prev, stripe_onboarding_status: 'active' } : null);
            setShowOnboarding(false);
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

      setIsAdmin(isAdmin);
      setSeller(sellerData);
      
      // Only access seller-specific data if seller exists
      if (sellerData) {
        setStreamUrl(sellerData.stream_embed_url || '');
        setSchedule(sellerData.schedule_text || '');

        if (!sellerData.stripe_account_id || sellerData.stripe_onboarding_status !== 'active') {
          setShowOnboarding(true);
        }

        const [productsResponse, salesResponse, streamsResponse, productCountResponse, completedSalesResponse] = await Promise.all([
          authFetch('/api/seller/products?limit=5'),
          authFetch('/api/seller/sales?limit=5'),
          authFetch('/api/seller/streams?status=pending,live&limit=1'),
          authFetch('/api/seller/products?count=true&head=true'),
          authFetch('/api/seller/sales?status=completed&select=amount,platform_fee,status,created_at,product_id'),
        ]);

        if (!productsResponse.ok) throw new Error('Failed to load products');
        if (!salesResponse.ok) throw new Error('Failed to load sales');
        if (!streamsResponse.ok) throw new Error('Failed to load streams');
        if (!productCountResponse.ok) throw new Error('Failed to load product count');
        if (!completedSalesResponse.ok) throw new Error('Failed to load completed sales');

        const productsData = await productsResponse.json();
        const salesData = await salesResponse.json();
        const streamsData = await streamsResponse.json();
        const productCountData = await productCountResponse.json();
        const completedSalesData = await completedSalesResponse.json();

        setProducts(productsData.products || []);
        setSales(salesData.sales || []);
        setStreams(streamsData.streams || []);

        const productCount = productCountData.count ?? 0;
        const allSales = completedSalesData.sales || [];
        const totalRevenue = allSales.reduce((sum: number, sale: any) => sum + (sale.amount - sale.platform_fee), 0);

        setStats({ totalProducts: productCount, totalSales: allSales.length, totalRevenue, pendingPayout: totalRevenue });

        // Prepare chart data with better error handling
        const salesByMonth = allSales?.reduce((acc: any, sale: PartialSale) => {
          if (!sale || !sale.created_at) return acc;
          const month = new Date(sale.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          acc[month] = (acc[month] || 0) + (sale.amount - sale.platform_fee);
          return acc;
        }, {});

        const salesChartData = Object.entries(salesByMonth || {}).map(([month, amount]) => ({
          month,
          revenue: amount || 0,
        }));

        const revenueByDay = allSales?.slice(-30).reduce((acc: any, sale: PartialSale) => {
          if (!sale || !sale.created_at) return acc;
          const day = new Date(sale.created_at).getDate();
          acc[day] = (acc[day] || 0) + (sale.amount - sale.platform_fee);
          return acc;
        }, {});

        const revenueChartData = Object.entries(revenueByDay || {}).map(([day, amount]) => ({
          day: parseInt(day),
          revenue: amount || 0,
        }));

        const topProducts = allSales?.reduce((acc: any, sale: PartialSale) => {
          if (!sale || !(sale as any).product_id) return acc;
          acc[(sale as any).product_id] = (acc[(sale as any).product_id] || 0) + 1;
          return acc;
        }, {});

        const productChartData = Object.entries(topProducts || {}).slice(0, 5).map(([productId, count]) => ({
          name: `Product ${productId.slice(0, 6)}...`,
          sales: count || 0,
        }));

        setSalesData(salesChartData);
        setRevenueData(revenueChartData);
        setProductData(productChartData);
        
        // Debug logs for chart data
        console.log('Sales Chart Data:', salesChartData);
        console.log('Revenue Chart Data:', revenueChartData);
        console.log('Product Chart Data:', productChartData);
        console.log('All Sales Data:', allSales);
        console.log('Stats:', stats);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStripeOnboarding = async () => {
    try {
      const response = await authFetch('/api/stripe/connect-onboarding', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.url) window.location.href = data.url;
    } catch (error) {
      console.error('Onboarding error:', error);
    }
  };

  const handleSaveStreamConfig = async () => {
    setSavingConfig(true);
    setConfigSaved(false);
    try {
      const response = await authFetch('/api/seller/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamEmbedUrl: streamUrl, scheduleText: schedule }),
      });
      const data = await response.json();
      if (response.ok) {
        setConfigSaved(true);
        setSeller(prev => prev ? { ...prev, stream_embed_url: streamUrl, schedule_text: schedule } : null);
        setTimeout(() => setConfigSaved(false), 3000);
      }
    } catch (error) {
      console.error('Save config error:', error);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleGoLive = async () => {
    try {
      // Check Restream connection status
      const response = await authFetch('/api/seller/restream-status');
      if (response.ok) {
        const data = await response.json();
        if (data.connected) {
          // If connected, go directly to instant live
          router.push('/seller/streaming/instant-live');
        } else {
          // If not connected, go to setup
          router.push('/seller/restream-setup');
        }
      } else {
        // If check fails, go to setup as fallback
        router.push('/seller/restream-setup');
      }
    } catch (error) {
      console.error('Failed to check Restream status:', error);
      // Fallback to setup
      router.push('/seller/restream-setup');
    }
  };

  const handleEditSale = (saleId: string) => {
    setEditingSale(saleId);
  };

  const handleSaveSale = async (saleId: string, updatedData: Partial<Sale>) => {
    try {
      const response = await fetch(`/api/sales/${saleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
      if (response.ok) {
        setSales(prev => prev.map(sale => 
          sale.id === saleId ? { ...sale, ...updatedData } : sale
        ));
        setEditingSale(null);
      }
    } catch (error) {
      console.error('Save sale error:', error);
    }
  };

  const getStatusPill = (status: string) => {
    switch (status) {
      case 'active':
      case 'approved':
        return <span className="pill pill-approved">Active</span>;
      case 'pending':
        return <span className="pill pill-pending">Pending</span>;
      case 'rejected':
        return <span className="pill pill-suspended">Rejected</span>;
      default:
        return <span className="pill" style={{ background: 'rgba(124,58,237,0.15)', color: 'var(--accent-primary)' }}>{status}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in-up">

        {/* ── Alerts ── */}
        {onboardingSuccess && (
          <div className="flex items-start gap-3 px-5 py-4 rounded-xl border border-[var(--accent-success)] bg-[rgba(16,185,129,0.08)] text-[var(--accent-success)]">
            <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Stripe Onboarding Complete</p>
              <p className="text-sm opacity-80">Your payment account is now active. You can start receiving payments!</p>
            </div>
          </div>
        )}

        {/* Live Stream Status */}
        {streamStatus && streamStatus.status === 'live' && (
          <div className={`flex items-start gap-3 px-5 py-4 rounded-xl border border-[var(--accent-success)] bg-[rgba(16,185,129,0.08)] text-[var(--accent-success)]`}>
            <Video className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">
                🔴 LIVE NOW
              </p>
              <p className="text-sm opacity-80">
                Your stream "{streamStatus.title}" is currently live!
              </p>
            </div>
          </div>
        )}

        {seller?.approval_status === 'pending' && (
          <div className="flex items-start gap-3 px-5 py-4 rounded-xl border border-[var(--accent-warning)] bg-[rgba(245,158,11,0.08)] text-[var(--accent-warning)]">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Account Pending Approval</p>
              <p className="text-sm opacity-80">Your seller account is pending admin approval. You can upload products but cannot go live until approved.</p>
            </div>
          </div>
        )}

        {showOnboarding && !onboardingSuccess && (
          <div className="flex items-start gap-3 px-5 py-4 rounded-xl border border-[var(--accent-danger)] bg-[rgba(239,68,68,0.08)] text-[var(--accent-danger)]">
            <CreditCard className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-sm">Complete Stripe Onboarding</p>
              <p className="text-sm opacity-80 mb-3">You need to complete Stripe Connect onboarding to receive payments.</p>
              <button onClick={handleStripeOnboarding} className="btn-primary text-sm px-4 py-2">
                Complete Onboarding
              </button>
            </div>
          </div>
        )}

        {/* ── Enhanced Analytics Dashboard ── */}
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Products', value: stats.totalProducts.toString(), icon: Package, change: null, color: 'var(--accent-primary)' },
              { label: 'Total Sales', value: stats.totalSales.toString(), icon: DollarSign, change: null, color: 'var(--accent-secondary)' },
              { label: 'Revenue', value: `$${stats.totalRevenue.toFixed(2)}`, icon: DollarSign, change: null, color: 'var(--accent-success)' },
              { label: 'Payout Status', value: seller?.stripe_onboarding_status === 'active' ? 'Active' : 'Pending', icon: CreditCard, change: null, color: 'var(--accent-warning)' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="card-premium flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">{label}</p>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                </div>
                <p className="text-3xl font-semibold text-[var(--text-primary)]">{value}</p>
              </div>
            ))}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <div className="card-premium">
              <div className="border-b border-[var(--border-default)] pb-4 mb-4">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Revenue Analytics</h3>
              </div>
              <div className="h-64">
                {salesData && salesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#7C3AED" 
                        strokeWidth={2}
                        dot={{ fill: "#7C3AED", r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
                    <div className="text-center">
                      <TrendingUp className="w-8 h-8 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium">No sales data yet</p>
                      <p className="text-sm">Complete your first sale to see revenue analytics here</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Top Products Chart */}
            <div className="card-premium">
              <div className="border-b border-[var(--border-default)] pb-4 mb-4">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Top Products</h3>
              </div>
              <div className="h-64">
                {productData && productData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={productData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="sales" fill="#06B6D4" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
                    <div className="text-center">
                      <Package className="w-8 h-8 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium">No product data yet</p>
                      <p className="text-sm">Start selling to see your top products here</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sales Funnel */}
            <div className="card-premium lg:col-span-2">
              <div className="border-b border-[var(--border-default)] pb-4 mb-4">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Sales Performance</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalSales}</div>
                  <div className="text-sm text-[var(--text-muted)]">Total Sales</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">${stats.totalRevenue.toFixed(2)}</div>
                  <div className="text-sm text-[var(--text-muted)]">Total Revenue</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{salesData.length > 0 ? Math.round((salesData[salesData.length - 1].revenue / stats.totalRevenue) * 100) : 0}%</div>
                  <div className="text-sm text-[var(--text-muted)]">Conversion Rate</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Go Live Banner ── */}
        {seller?.approval_status === 'approved' && seller?.stripe_onboarding_status === 'active' && (
          <div className="card-premium">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[rgba(239,68,68,0.12)] flex items-center justify-center">
                  <Video className="w-6 h-6 text-[var(--accent-danger)]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="live-dot" />
                    <span className="live-text">{streamStatus?.status === 'live' ? 'Live' : 'Ready'}</span>
                  </div>
                  <h3 className="font-semibold text-[var(--text-primary)]">
                    {streamStatus?.status === 'live' ? 'Currently Live' : 'Ready to Go Live?'}
                  </h3>
                  <p className="text-sm text-[var(--text-muted)]">
                    {streamStatus?.status === 'live' 
                      ? 'You are currently streaming live.' 
                      : 'Start your live stream and sell to customers in real-time.'}
                  </p>
                </div>
              </div>
              <button onClick={handleGoLive} className="btn-primary flex items-center gap-2">
                <Video className="w-4 h-4" />
                {streamStatus?.status === 'live' ? 'Currently Live' : 'Go Live'}
              </button>
            </div>
          </div>
        )}

        {/* ── Stream Config ── */}
        <div className="card-premium">
          <div className="border-b border-[var(--border-default)] pb-4 mb-5">
            <h2 className="font-semibold text-[var(--text-primary)]">Live Stream Setup</h2>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">Configure your stream embed and schedule</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-secondary)]">Stream Embed URL</label>
              <input
                id="streamUrl"
                placeholder="https://restream.io/embed/... or TikTok Live URL"
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                className="input-premium"
              />
              <p className="text-xs text-[var(--text-muted)]">Paste your Restream embed URL or TikTok Live link</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-secondary)]">Stream Schedule</label>
              <input
                id="schedule"
                placeholder="e.g., Monday, Wednesday, Friday at 8 PM EST"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                className="input-premium"
              />
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleSaveStreamConfig}
                disabled={savingConfig}
                className="btn-primary text-sm px-5 py-2.5 flex items-center gap-2 disabled:opacity-60"
              >
                {savingConfig && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {savingConfig ? 'Saving...' : 'Save Configuration'}
              </button>
              {configSaved && (
                <span className="text-sm text-[var(--accent-success)] flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Saved!
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Past Streams ── */}
        <div className="card-premium">
          <div className="border-b border-[var(--border-default)] pb-4 mb-5">
            <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Video className="w-5 h-5 text-red-500" />
              Past Streams
            </h2>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">Your recent streaming sessions</p>
          </div>
          <div className="space-y-4">
            {streams.length === 0 ? (
              <div className="text-center py-8 text-[var(--text-muted)]">
                <Video className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">No streams yet</p>
                <p className="text-sm">Start your first stream to see your streaming history here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {streams.map((stream) => (
                  <div key={stream.id} className="flex items-center justify-between p-4 bg-[var(--bg-raised)] rounded-lg border border-[var(--border-default)] hover:bg-[var(--row-hover)] transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${
                        stream.status === 'live' ? 'bg-red-500 animate-pulse' : 
                        stream.status === 'ended' ? 'bg-gray-400' : 
                        'bg-yellow-500'
                      }`} />
                      <div>
                        <h4 className="font-medium text-[var(--text-primary)]">{stream.title}</h4>
                        <p className="text-sm text-[var(--text-muted)]">
                          {new Date(stream.created_at).toLocaleDateString()} at {new Date(stream.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                        {stream.platforms && (
                          <p className="text-xs text-[var(--text-muted)] mt-1">
                            Platforms: {Array.isArray(stream.platforms) ? stream.platforms.join(', ') : stream.platforms}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        stream.status === 'live' ? 'bg-red-100 text-red-800' :
                        stream.status === 'ended' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {stream.status === 'live' ? '🔴 LIVE' : 
                         stream.status === 'ended' ? 'Ended' : 
                         'Pending'}
                      </span>
                      {stream.actual_start && (
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                          Duration: {Math.floor((new Date(stream.actual_end || Date.now()).getTime() - new Date(stream.actual_start).getTime()) / 60000)} min
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Recent Products ── */}
        <div className="card-premium">
          <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4 mb-4">
            <div>
              <h2 className="font-semibold text-[var(--text-primary)]">Recent Products</h2>
              <p className="text-sm text-[var(--text-muted)] mt-0.5">Your recently uploaded products</p>
            </div>
            <Link href="/seller/products">
              <button className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1">
                View All <ExternalLink className="w-3 h-3" />
              </button>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[var(--border-default)] hover:bg-transparent">
                  {['Name', 'Price', 'Stock', 'Status'].map((h) => (
                    <TableHead key={h} className="text-xs uppercase tracking-widest text-[var(--text-muted)] bg-[var(--bg-raised)] font-medium">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-[var(--text-muted)]">
                      No products yet.{' '}
                      <Link href="/seller/products" className="text-[var(--accent-primary)] hover:underline">Upload your first product</Link>
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow key={product.id} className="border-b border-[var(--border-default)] hover:bg-[var(--row-hover)] transition-colors">
                      <TableCell className="font-medium text-[var(--text-primary)]">{product.name}</TableCell>
                      <TableCell className="text-[var(--text-secondary)]">${product.price.toFixed(2)}</TableCell>
                      <TableCell className="text-[var(--text-secondary)]">{product.stock_quantity}</TableCell>
                      <TableCell>{getStatusPill(product.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* ── Recent Sales ── */}
        <div className="card-premium">
          <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4 mb-4">
            <div>
              <h2 className="font-semibold text-[var(--text-primary)]">Recent Sales</h2>
              <p className="text-sm text-[var(--text-muted)] mt-0.5">Your recent transactions</p>
            </div>
            <Link href="/seller/sales">
              <button className="btn-secondary text-sm px-3 py-1.5 flex items-center gap-1">
                Edit Sales
              </button>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[var(--border-default)] hover:bg-transparent">
                  {['Product ID', 'Amount', 'Date', 'Status', 'Actions'].map((h) => (
                    <TableHead key={h} className="text-xs uppercase tracking-widest text-[var(--text-muted)] bg-[var(--bg-raised)] font-medium">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-[var(--text-muted)]">
                      No sales yet. Complete onboarding and start selling!
                    </TableCell>
                  </TableRow>
                ) : (
                  sales.map((sale) => (
                    <TableRow key={sale.id} className="border-b border-[var(--border-default)] hover:bg-[var(--row-hover)] transition-colors">
                      <TableCell className="font-medium text-[var(--text-secondary)] font-mono text-xs">{sale.product_id?.slice(0, 8)}...</TableCell>
                      <TableCell className="text-[var(--text-primary)] font-semibold">${sale.amount.toFixed(2)}</TableCell>
                      <TableCell className="text-[var(--text-muted)]">{new Date(sale.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{getStatusPill(sale.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleEditSale(sale.id)}
                            className="text-[var(--accent-primary)] hover:text-[var(--accent-primary)]/80 p-1 rounded hover:bg-[var(--bg-raised)] transition-colors"
                          >
                            <Edit className="w-3 h-3" />
                            Edit
                          </button>
                          <button className="text-[var(--accent-danger)] hover:text-[var(--accent-danger)]/80 p-1 rounded hover:bg-[rgba(239,68,68,0.1)] transition-colors">
                            Delete
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>

      {/* Edit Sale Modal */}
      {editingSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-surface)] rounded-xl p-6 w-96 max-w-full mx-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Edit Sale</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">Amount</label>
                <input
                  type="number"
                  className="input-premium mt-1"
                  placeholder="Enter amount"
                  onChange={(e) => {
                    const sale = sales.find(s => s.id === editingSale);
                    if (sale) {
                      handleSaveSale(editingSale, { amount: parseFloat(e.target.value) });
                    }
                  }}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">Status</label>
                <select 
                  className="input-premium mt-1"
                  onChange={(e) => {
                    const sale = sales.find(s => s.id === editingSale);
                    if (sale) {
                      handleSaveSale(editingSale, { status: e.target.value });
                    }
                  }}
                >
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingSale(null)}
                className="btn-secondary text-sm px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardContent() {
  return (
    <Suspense fallback={<div>Loading dashboard...</div>}>
      <DashboardContentInner />
    </Suspense>
  );
}
