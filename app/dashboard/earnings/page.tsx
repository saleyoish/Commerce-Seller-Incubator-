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
  Plus
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
      // Use custom JWT auth instead of Supabase Auth
      const { isSeller, isAdmin, seller: sellerData } = await checkUserStatus();

      if (!isSeller && !isAdmin) {
        router.push('/login');
        return;
      }

      if (!sellerData) {
        router.push('/signup');
        return;
      }

      setSeller(sellerData);

      // Use API route with JWT authentication instead of direct Supabase
      const res = await fetch('/api/sales', {
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to load earnings data');
      }

      const data = await res.json();
      // Filter only verified sales for earnings
      const verifiedSales = (data.sales || []).filter((sale: PlatformSale) => sale.verification_status === 'verified');
      setSales(verifiedSales);
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
    const totalSales = filteredSales.reduce((sum, s) => sum + s.sale_amount, 0);
    const totalPlatformFees = filteredSales.reduce((sum, s) => sum + s.platform_fee, 0);
    const totalCommission = filteredSales.reduce((sum, s) => sum + s.our_commission, 0);
    const totalPayout = filteredSales.reduce((sum, s) => sum + s.seller_payout, 0);
    const pendingPayout = filteredSales
      .filter(s => s.payout_status === 'pending')
      .reduce((sum, s) => sum + s.seller_payout, 0);

    return {
      totalSales,
      totalPlatformFees,
      totalCommission,
      totalPayout,
      pendingPayout,
      saleCount: filteredSales.length,
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
        <h1 className="text-3xl font-bold mb-2">Earnings Dashboard</h1>
        <p className="text-gray-600">Track your sales across all platforms</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Sales</p>
                <p className="text-2xl font-bold">${stats.totalSales.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Your Earnings</p>
                <p className="text-2xl font-bold text-green-600">${stats.totalPayout.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Wallet className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Payout</p>
                <p className="text-2xl font-bold text-orange-600">${stats.pendingPayout.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Orders</p>
                <p className="text-2xl font-bold">{stats.saleCount}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <ShoppingBag className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                {DATE_RANGES.map((range) => (
                  <option key={range.value} value={range.value}>{range.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-500">Platforms:</span>
              <div className="flex gap-2">
                {Object.keys(PLATFORM_COLORS).map((platform) => (
                  <button
                    key={platform}
                    onClick={() => togglePlatformFilter(platform)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      platformFilter.length === 0 || platformFilter.includes(platform)
                        ? 'bg-gray-800 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {getPlatformIcon(platform)}
                  </button>
                ))}
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={exportCSV} className="ml-auto">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Sales by Platform</CardTitle>
            <CardDescription>Revenue breakdown across connected platforms</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={platformData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="platform" type="category" width={80} />
                  <Tooltip formatter={(value) => typeof value === 'number' ? `$${value.toFixed(2)}` : ''} />
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

        <Card>
          <CardHeader>
            <CardTitle>Sales Trend</CardTitle>
            <CardDescription>Daily sales over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip formatter={(value) => typeof value === 'number' ? `$${value.toFixed(2)}` : ''} />
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
      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-3 px-4 text-sm font-medium">Date</th>
                <th className="text-left py-3 px-4 text-sm font-medium">Platform</th>
                <th className="text-left py-3 px-4 text-sm font-medium">Product</th>
                <th className="text-right py-3 px-4 text-sm font-medium">Sale</th>
                <th className="text-right py-3 px-4 text-sm font-medium">Platform Fee</th>
                <th className="text-right py-3 px-4 text-sm font-medium">Our Fee (15%)</th>
                <th className="text-right py-3 px-4 text-sm font-medium">You Earned</th>
                <th className="text-center py-3 px-4 text-sm font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
                {filteredSales.slice(0, 50).map((sale) => (
                  <tr key={sale.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm">
                      {new Date(sale.sale_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="capitalize text-xs">
                        {sale.platform}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm truncate max-w-xs">
                      {sale.product_name || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      ${sale.sale_amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-red-600">
                      -${sale.platform_fee.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-orange-600">
                      -${sale.our_commission.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-medium text-green-600">
                      ${sale.seller_payout.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {sale.entry_type === 'manual' ? (
                        <Badge 
                          variant="outline" 
                          className={
                            sale.verification_status === 'verified' 
                              ? 'border-green-500 text-green-600' 
                              : sale.verification_status === 'pending'
                              ? 'border-yellow-500 text-yellow-600'
                              : 'border-red-500 text-red-600'
                          }
                        >
                          {sale.verification_status === 'verified' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {sale.verification_status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                          {sale.verification_status === 'rejected' && <AlertCircle className="w-3 h-3 mr-1" />}
                          {sale.verification_status}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-green-500 text-green-600">
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
                <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No sales found for the selected period</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
