'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type PlatformSale, type Seller } from '@/lib/supabase-client';
import { checkUserStatus } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  DollarSign,
  TrendingUp,
  Wallet,
  Clock,
  Download,
  Filter,
  Calendar,
  ShoppingBag,
  CheckCircle,
  AlertCircle,
  Plus,
  Hourglass
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

const PLATFORM_COLORS = {
  tiktok: '#000000',
  whatnot: '#FF6B35',
  youtube: '#FF0000',
  facebook: '#1877F2',
  instagram: '#E4405F',
  platform_site: '#10B981',
};

const DATE_RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

export default function EarningsPage() {
  const router = useRouter();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [sales, setSales] = useState<PlatformSale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [platformFilter, setPlatformFilter] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEarningsData();
  }, []);

  const loadEarningsData = async () => {
    try {
      // Check user status via API (avoids RLS issues)
      const { isSeller, isAdmin, seller: sellerData } = await checkUserStatus();

      if (!isSeller && !isAdmin) {
        console.log("seller data:", sellerData);
        router.push('/login');
        return;
      }

      setSeller(sellerData);

      // Get platform sales using API route with JWT authentication
      if (sellerData) {
        const res = await fetch('/api/sales', {
          credentials: 'omit',
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to load earnings data');
        }

        const data = await res.json();
        // Filter for verified and pending sales
        const filteredSales = (data.sales || []).filter((sale: PlatformSale) =>
          ['verified', 'pending'].includes(sale.verification_status)
        );
        setSales(filteredSales);
      }
    } catch (error) {
      console.error('Error loading earnings:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load earnings data';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter sales based on date range and platform
  const filteredSales = useMemo(() => {
    let filtered = sales;

    // Date filter
    if (dateRange !== 'all') {
      const days = parseInt(dateRange);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      filtered = filtered.filter(s => new Date(s.sale_date) >= cutoffDate);
    }

    // Platform filter
    if (platformFilter.length > 0) {
      filtered = filtered.filter(s => platformFilter.includes(s.platform));
    }

    return filtered;
  }, [sales, dateRange, platformFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const verifiedSales = filteredSales.filter(s => s.verification_status === 'verified');
    const pendingSales = filteredSales.filter(s => s.verification_status === 'pending');

    // Use all sales for total sales (not just verified)
    const totalSales = filteredSales.reduce((sum, s) => sum + s.sale_amount, 0);
    const totalPlatformFees = verifiedSales.reduce((sum, s) => sum + s.platform_fee, 0);
    const totalCommission = verifiedSales.reduce((sum, s) => sum + s.our_commission, 0);
    const totalPayout = verifiedSales.reduce((sum, s) => sum + s.seller_payout, 0);
    const pendingPayout = verifiedSales
      .filter(s => s.payout_status === 'pending')
      .reduce((sum, s) => sum + s.seller_payout, 0);

    // Pending sales (awaiting verification)
    const pendingVerificationAmount = pendingSales.reduce((sum, s) => sum + s.sale_amount, 0);
    const pendingVerificationCount = pendingSales.length;

    return {
      totalSales,
      totalPlatformFees,
      totalCommission,
      totalPayout,
      pendingPayout,
      saleCount: verifiedSales.length,
      pendingVerificationAmount,
      pendingVerificationCount,
    };
  }, [filteredSales]);

  // Platform breakdown for chart
  const platformData = useMemo(() => {
    const breakdown: Record<string, number> = {};
    filteredSales.forEach(sale => {
      breakdown[sale.platform] = (breakdown[sale.platform] || 0) + sale.sale_amount;
    });
    return Object.entries(breakdown).map(([platform, amount]) => ({
      platform: platform.charAt(0).toUpperCase() + platform.slice(1),
      amount,
      color: PLATFORM_COLORS[platform as keyof typeof PLATFORM_COLORS] || '#999',
    }));
  }, [filteredSales]);

  // Daily sales data for line chart
  const dailyData = useMemo(() => {
    const days: Record<string, number> = {};
    
    // Initialize last 30 days with 0
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days[date.toISOString().split('T')[0]] = 0;
    }

    // Add sales
    filteredSales.forEach(sale => {
      const date = sale.sale_date.split('T')[0];
      if (days[date] !== undefined) {
        days[date] += sale.sale_amount;
      }
    });

    return Object.entries(days).map(([date, amount]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      amount,
    }));
  }, [filteredSales]);

  const togglePlatformFilter = (platform: string) => {
    setPlatformFilter(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const exportCSV = () => {
    const headers = ['Date', 'Platform', 'Product', 'Sale Amount', 'Platform Fee', 'Our Commission', 'Your Earnings'];
    const rows = filteredSales.map(s => [
      new Date(s.sale_date).toLocaleDateString(),
      s.platform,
      s.product_name || 'N/A',
      s.sale_amount.toFixed(2),
      s.platform_fee.toFixed(2),
      s.our_commission.toFixed(2),
      s.seller_payout.toFixed(2),
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `earnings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getPlatformIcon = (platform: string) => {
    return platform.charAt(0).toUpperCase() + platform.slice(1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-[var(--text-primary)]">Earnings Dashboard</h1>
        <p className="text-[var(--text-muted)]">Track your sales across all platforms</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        <Card className="card-premium">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-muted)]">Total Sales</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">${stats.totalSales.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-blue-100/20 rounded-lg">
                <DollarSign className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-muted)]">Your Earnings</p>
                <p className="text-2xl font-bold text-green-400">${stats.totalPayout.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-green-100/20 rounded-lg">
                <Wallet className="w-5 h-5 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-muted)]">Pending Payout</p>
                <p className="text-2xl font-bold text-orange-400">${stats.pendingPayout.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-orange-100/20 rounded-lg">
                <Clock className="w-5 h-5 text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Verification Card */}
        <Card className="card-premium border-yellow-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-400">Pending Verification</p>
                <p className="text-2xl font-bold text-yellow-400">${stats.pendingVerificationAmount.toLocaleString()}</p>
                <p className="text-xs text-yellow-500">{stats.pendingVerificationCount} sales awaiting approval</p>
              </div>
              <div className="p-3 bg-yellow-100/20 rounded-lg">
                <Hourglass className="w-5 h-5 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-muted)]">Total Orders</p>
                <p className="text-2xl font-bold text-purple-400">{stats.saleCount}</p>
              </div>
              <div className="p-3 bg-purple-100/20 rounded-lg">
                <ShoppingBag className="w-5 h-5 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-8 card-premium">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-default)]"
              >
                {DATE_RANGES.map((range) => (
                  <option key={range.value} value={range.value} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">{range.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-sm text-[var(--text-muted)]">Platforms:</span>
              <div className="flex gap-2">
                {Object.keys(PLATFORM_COLORS).map((platform) => (
                  <button
                    key={platform}
                    onClick={() => togglePlatformFilter(platform)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      platformFilter.length === 0 || platformFilter.includes(platform)
                        ? 'bg-[var(--accent-primary)] text-white'
                        : 'bg-[var(--bg-raised)] text-[var(--text-muted)]'
                    }`}
                  >
                    {getPlatformIcon(platform)}
                  </button>
                ))}
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={exportCSV} className="ml-auto btn-secondary">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Sales by Platform</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">Revenue breakdown across connected platforms</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={platformData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                  <XAxis type="number" stroke="var(--text-secondary)" />
                  <YAxis dataKey="platform" type="category" width={80} stroke="var(--text-secondary)" />
                  <Tooltip 
                    formatter={(value) => typeof value === 'number' ? `$${value.toFixed(2)}` : ''}
                    contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  />
                  <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                    {platformData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Sales Trend</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">Daily sales over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} stroke="var(--text-secondary)" />
                  <YAxis stroke="var(--text-secondary)" />
                  <Tooltip 
                    formatter={(value) => typeof value === 'number' ? `$${value.toFixed(2)}` : ''}
                    contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Commission Breakdown Table */}
      <Card className="card-premium">
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--bg-raised)]">
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">Date</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">Platform</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">Product</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">Sale</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">Platform Fee</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">Our Fee (15%)</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">You Earned</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">Status</th>
              </tr>
            </thead>
            <tbody>
                {filteredSales.slice(0, 50).map((sale) => (
                  <tr key={sale.id} className="border-b border-[var(--border-default)] hover:bg-[var(--row-hover)]">
                    <td className="py-3 px-4 text-sm text-[var(--text-primary)]">
                      {new Date(sale.sale_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="capitalize text-xs text-[var(--text-primary)] border-[var(--border-default)]">
                        {sale.platform}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm truncate max-w-xs text-[var(--text-primary)]">
                      {sale.product_name || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-[var(--text-primary)]">
                      ${sale.sale_amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-red-400">
                      -${sale.platform_fee.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-orange-400">
                      -${sale.our_commission.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-medium text-green-400">
                      ${sale.seller_payout.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {sale.entry_type === 'manual' ? (
                        <Badge 
                          variant="outline" 
                          className={
                            sale.verification_status === 'verified' 
                              ? 'border-green-500 text-green-400' 
                              : sale.verification_status === 'pending'
                              ? 'border-yellow-500 text-yellow-400'
                              : 'border-red-500 text-red-400'
                          }
                        >
                          {sale.verification_status === 'verified' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {sale.verification_status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                          {sale.verification_status === 'rejected' && <AlertCircle className="w-3 h-3 mr-1" />}
                          {sale.verification_status}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-green-500 text-green-400">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Auto
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredSales.length === 0 && (
              <div className="text-center py-12">
                <TrendingUp className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
                <p className="text-[var(--text-muted)]">No sales found for the selected period</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
