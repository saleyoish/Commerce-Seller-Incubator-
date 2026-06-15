'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authFetch } from '@/lib/auth';
import type { PlatformSale } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { 
  Loader2, 
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  ShoppingBag,
  User,
  Calendar,
  ExternalLink,
  Search,
  Filter
} from 'lucide-react';

const STATUS_FILTERS = [
  { value: 'all', label: 'All Sales', color: 'bg-gray-500' },
  { value: 'pending', label: 'Pending', color: 'bg-yellow-500' },
  { value: 'verified', label: 'Verified', color: 'bg-green-500' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-500' },
];

export default function AdminManualSalesPage() {
  const router = useRouter();
  const [sales, setSales] = useState<PlatformSale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

  useEffect(() => {
    loadSales();
  }, [statusFilter]);

  const loadSales = async () => {
    try {
      const response = await authFetch('/api/admin/sales');
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load sales data');
      }

      const data = await response.json();
      const allSales: PlatformSale[] = data.sales || [];
      const manualSales = allSales.filter((sale) => sale.entry_type === 'manual');
      const filteredSales = statusFilter === 'all'
        ? manualSales
        : manualSales.filter((sale) => sale.verification_status === statusFilter);

      setSales(filteredSales);
    } catch (error: any) {
      console.error('Error loading sales:', error);
      setError(error.message || 'Failed to load sales data');
    } finally {
      setIsLoading(false);
    }
  };

  const verifySale = async (saleId: string, status: 'verified' | 'rejected') => {
    setIsProcessing(saleId);
    setError(null);
    setSuccess(null);

    try {
      const updateData: any = {
        verification_status: status,
        verified_at: new Date().toISOString(),
      };

      if (status === 'rejected') {
        if (!rejectionReason.trim()) {
          setShowRejectModal(saleId);
          setIsProcessing(null);
          return;
        }
        updateData.rejection_reason = rejectionReason;
      }

      const response = await authFetch('/api/admin/sales', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saleId, status, rejectionReason: updateData.rejection_reason }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to process sale');
      }

      setSuccess(`Sale ${status === 'verified' ? 'approved' : 'rejected'} successfully`);
      setRejectionReason('');
      setShowRejectModal(null);
      await loadSales();
    } catch (error: any) {
      console.error('Error verifying sale:', error);
      setError(error.message || 'Failed to process sale');
    } finally {
      setIsProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Verified</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
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
        <h1 className="text-3xl font-bold mb-2">Manual Sales Verification</h1>
        <p className="text-gray-600">Review and verify manually submitted sales</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {sales.filter(s => s.verification_status === 'pending').length}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Verified Today</p>
                <p className="text-2xl font-bold text-green-600">
                  {sales.filter(s => 
                    s.verification_status === 'verified' && 
                    s.verified_at && 
                    new Date(s.verified_at).toDateString() === new Date().toDateString()
                  ).length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Value</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${sales
                    .filter(s => s.verification_status === 'pending')
                    .reduce((sum, s) => sum + s.sale_amount, 0)
                    .toLocaleString()}
                </p>
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
                <p className="text-sm text-gray-500">Total Manual Sales</p>
                <p className="text-2xl font-bold text-purple-600">{sales.length}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <ShoppingBag className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {STATUS_FILTERS.map((filter) => (
          <Button
            key={filter.value}
            variant={statusFilter === filter.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(filter.value)}
            className={statusFilter === filter.value ? filter.color : ''}
          >
            <Filter className="w-3 h-3 mr-2" />
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Sales to Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Seller</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Platform</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Product</th>
                  <th className="text-right py-3 px-4 text-sm font-medium">Amount</th>
                  <th className="text-right py-3 px-4 text-sm font-medium">Your Payout</th>
                  <th className="text-center py-3 px-4 text-sm font-medium">Status</th>
                  <th className="text-center py-3 px-4 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} className="border-b hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{formatDate(sale.sale_date)}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{sale.seller_id.slice(0, 8)}...</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant="outline" className="capitalize text-xs">
                        {sale.platform}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-sm truncate max-w-xs">
                      {sale.product_name || 'N/A'}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <p className="font-medium">${sale.sale_amount.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">
                        Fee: ${sale.platform_fee.toFixed(2)}
                      </p>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <p className="font-medium text-green-600">${sale.seller_payout.toFixed(2)}</p>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {getStatusBadge(sale.verification_status)}
                    </td>
                    <td className="py-4 px-4">
                      {sale.verification_status === 'pending' ? (
                        <div className="flex gap-2 justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-green-500 text-green-600 hover:bg-green-50"
                            onClick={() => verifySale(sale.id, 'verified')}
                            disabled={isProcessing === sale.id}
                          >
                            {isProcessing === sale.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500 text-red-600 hover:bg-red-50"
                            onClick={() => setShowRejectModal(sale.id)}
                            disabled={isProcessing === sale.id}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center text-sm text-gray-500">
                          {sale.verification_status === 'rejected' && sale.rejection_reason && (
                            <span className="text-xs" title={sale.rejection_reason}>
                              Reason: {sale.rejection_reason.slice(0, 20)}...
                            </span>
                          )}
                          {sale.verification_status === 'verified' && sale.verified_at && (
                            <span className="text-xs">
                              Verified {formatDate(sale.verified_at)}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {sales.length === 0 && (
              <div className="text-center py-12">
                <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No manual sales found</p>
                <p className="text-sm text-gray-400 mt-1">
                  Sales will appear here when sellers submit them
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Reject Sale
              </CardTitle>
              <CardDescription>
                Please provide a reason for rejecting this sale. This will be sent to the seller.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Why is this sale being rejected?"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="mb-4"
              />
              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  onClick={() => verifySale(showRejectModal, 'rejected')}
                  disabled={!rejectionReason.trim()}
                  className="flex-1"
                >
                  Reject Sale
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectModal(null);
                    setRejectionReason('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
