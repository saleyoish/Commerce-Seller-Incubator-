'use client';

import { useEffect, useState } from 'react';
import { createClientSideSupabase, type Sale } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, DollarSign, TrendingUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PLATFORM_CONFIG } from '@/lib/config';

export default function AdminSalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalGMV: 0,
    totalRevenue: 0,
    totalSales: 0,
  });

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      const supabase = createClientSideSupabase();
      const { data, error } = await supabase
        .from('sales')
        .select('*, sellers(email), products(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSales(data || []);

      // Calculate stats
      const completedSales = (data || []).filter((s: any) => s.status === 'completed');
      const gmv = completedSales.reduce((sum: number, s: any) => sum + s.amount, 0);
      const revenue = completedSales.reduce((sum: number, s: any) => sum + s.platform_fee, 0);

      setStats({
        totalGMV: gmv,
        totalRevenue: revenue,
        totalSales: completedSales.length,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'refunded':
        return <Badge variant="destructive">Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total GMV</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(stats?.totalGMV ?? 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Gross Merchandise Value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(stats?.totalRevenue ?? 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{PLATFORM_CONFIG.PLATFORM_FEE_PERCENT}% commission</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSales ?? 0}</div>
            <p className="text-xs text-muted-foreground">Completed transactions</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Sales</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Platform Fee</TableHead>
                <TableHead>Net to Seller</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                    No sales yet
                  </TableCell>
                </TableRow>
              ) : (
                sales.map((sale: any) => (
                  <TableRow key={sale.id}>
                    <TableCell>{new Date(sale.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{sale.sellers?.email}</TableCell>
                    <TableCell>{sale.products?.name || 'Unknown'}</TableCell>
                    <TableCell className="font-medium">${sale.amount.toFixed(2)}</TableCell>
                    <TableCell>${sale.platform_fee.toFixed(2)}</TableCell>
                    <TableCell>${(sale.amount - sale.platform_fee).toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(sale.status)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
