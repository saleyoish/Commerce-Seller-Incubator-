'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authFetch } from '@/lib/auth';
import { signOut } from '@/lib/auth-client';
import { useAuth } from '@/context/AuthContext';
import { type Seller, type Product, type Sale } from '@/lib/supabase-client';
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
} from 'lucide-react';

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
    if (!user) {
      router.push('/login');
      return;
    }
    loadDashboardData();
  }, [user, loading]);

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
      const sellerData = data.seller;

      if (!isSeller && !isAdmin) {
        router.push('/login');
        return;
      }

      if (!sellerData) {
        router.push('/signup');
        return;
      }

      setIsAdmin(isAdmin);
      setSeller(sellerData);
      if (sellerData) {
        setStreamUrl(sellerData.stream_embed_url || '');
        setSchedule(sellerData.schedule_text || '');

        if (!sellerData.stripe_account_id || sellerData.stripe_onboarding_status !== 'active') {
          setShowOnboarding(true);
        }

        const productsResponse = await authFetch('/api/seller/products?limit=5');
        const salesResponse = await authFetch('/api/seller/sales?limit=5');
        const productCountResponse = await authFetch('/api/seller/products?count=true&head=true');
        const completedSalesResponse = await authFetch('/api/seller/sales?status=completed&select=amount,platform_fee,status');

        if (!productsResponse.ok) throw new Error('Failed to load products');
        if (!salesResponse.ok) throw new Error('Failed to load sales');
        if (!productCountResponse.ok) throw new Error('Failed to load product count');
        if (!completedSalesResponse.ok) throw new Error('Failed to load completed sales');

        const productsData = await productsResponse.json();
        const salesData = await salesResponse.json();
        const productCountData = await productCountResponse.json();
        const completedSalesData = await completedSalesResponse.json();

        setProducts(productsData.products || []);
        setSales(salesData.sales || []);

        const productCount = productCountData.count ?? 0;
        const allSales = completedSalesData.sales || [];
        const totalRevenue = allSales.reduce((sum: number, sale: any) => sum + (sale.amount - sale.platform_fee), 0);

        setStats({ totalProducts: productCount, totalSales: allSales.length, totalRevenue, pendingPayout: totalRevenue });
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStripeOnboarding = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch('/api/stripe/connect-onboarding', { 
        method: 'POST',
        headers,
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
      const response = await fetch('/api/seller/config', {
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
      {/* ── Header ── */}
      <header className="bg-[var(--bg-nav)] border-b border-[var(--border-default)] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#7C3AED] to-[#06B6D4] rounded-lg flex items-center justify-center">
              <LayoutDashboard className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-[var(--text-primary)]">Seller Dashboard</span>
            {seller?.approval_status && (
              <span className="hidden sm:inline">{getStatusPill(seller.approval_status)}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link href="/admin">
                <button className="btn-secondary text-sm px-4 py-2 flex items-center gap-2">
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  Admin
                </button>
              </Link>
            )}
            <Link href="/dashboard/products">
              <button className="btn-secondary text-sm px-4 py-2">Manage Products</button>
            </Link>
            <button
              className="btn-secondary text-sm px-4 py-2 flex items-center gap-2"
              onClick={async () => {
                await signOut();
                router.push('/login');
              }}
            >
              <LogOut className="w-3.5 h-3.5" />
              Log Out
            </button>
          </div>
        </div>
      </header>

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

        {/* ── Stat Cards ── */}
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
                    <span className="live-text">Ready</span>
                  </div>
                  <h3 className="font-semibold text-[var(--text-primary)]">Ready to Go Live?</h3>
                  <p className="text-sm text-[var(--text-muted)]">Start your live stream and sell to customers in real-time.</p>
                </div>
              </div>
              <Link href={`/live/${seller.id}`}>
                <button className="btn-primary flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  Go Live
                </button>
              </Link>
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

        {/* ── Recent Products ── */}
        <div className="card-premium">
          <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4 mb-4">
            <div>
              <h2 className="font-semibold text-[var(--text-primary)]">Recent Products</h2>
              <p className="text-sm text-[var(--text-muted)] mt-0.5">Your recently uploaded products</p>
            </div>
            <Link href="/dashboard/products">
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
                      <Link href="/dashboard/products" className="text-[var(--accent-primary)] hover:underline">Upload your first product</Link>
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
          <div className="border-b border-[var(--border-default)] pb-4 mb-4">
            <h2 className="font-semibold text-[var(--text-primary)]">Recent Sales</h2>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">Your recent transactions</p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[var(--border-default)] hover:bg-transparent">
                  {['Product ID', 'Amount', 'Date', 'Status'].map((h) => (
                    <TableHead key={h} className="text-xs uppercase tracking-widest text-[var(--text-muted)] bg-[var(--bg-raised)] font-medium">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-[var(--text-muted)]">
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
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
}
