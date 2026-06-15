'use client';

import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/auth';
import { type PlatformSale, type Seller } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, DollarSign, TrendingUp, CheckCircle, XCircle, Clock, AlertTriangle, Edit, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PLATFORM_CONFIG } from '@/lib/config';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function AdminSalesPage() {
  const [sales, setSales] = useState<PlatformSale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [editingSale, setEditingSale] = useState<PlatformSale | null>(null);
  const [editFormData, setEditFormData] = useState({
    product_name: '',
    sale_amount: 0,
    platform: '',
    sale_date: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [stats, setStats] = useState({
    totalGMV: 0,
    totalRevenue: 0,
    totalSales: 0,
    pendingSales: 0,
  });

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      const response = await authFetch('/api/admin/sales');

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to load sales');
      }

      const { sales } = await response.json();
      setSales(sales || []);

      // Calculate stats from platform_sales
      const verifiedSales = (sales || []).filter((s: any) => s.verification_status === 'verified');
      const pendingSales = (sales || []).filter((s: any) => s.verification_status === 'pending');

      const gmv = verifiedSales.reduce((sum: number, s: any) => sum + s.sale_amount, 0);
      const revenue = verifiedSales.reduce((sum: number, s: any) => sum + s.our_commission, 0);

      setStats({
        totalGMV: gmv,
        totalRevenue: revenue,
        totalSales: verifiedSales.length,
        pendingSales: pendingSales.length,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const verifySale = async (saleId: string, status: 'verified' | 'rejected') => {
    setIsProcessing(saleId);
    setError(null);
    setSuccess(null);

    try {
      if (status === 'rejected') {
        if (!rejectionReason.trim()) {
          setShowRejectModal(saleId);
          setIsProcessing(null);
          return;
        }
      }

      const response = await authFetch('/api/admin/sales', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          saleId,
          status,
          rejectionReason: status === 'rejected' ? rejectionReason : undefined,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to process sale');
      }

      setSuccess(`Sale ${status === 'verified' ? 'approved' : 'rejected'} successfully`);
      setRejectionReason('');
      setShowRejectModal(null);
      await loadSales();
    } catch (error) {
      console.error('Error verifying sale:', error);
      setError('Failed to process sale');
    } finally {
      setIsProcessing(null);
    }
  };

  const startEditing = (sale: PlatformSale) => {
    setEditingSale(sale);
    setEditFormData({
      product_name: sale.product_name || '',
      sale_amount: sale.sale_amount,
      platform: sale.platform,
      sale_date: sale.sale_date ? new Date(sale.sale_date).toISOString().split('T')[0] : '',
    });
    setIsEditing(true);
  };

  const handleUpdateSale = async () => {
    if (!editingSale) return;
    
    setIsProcessing(editingSale.id);
    setError(null);

    try {
      const saleAmount = editFormData.sale_amount;
      const platformFeePercent = PLATFORM_CONFIG.PLATFORM_FEE_PERCENT;
      
      const ourCommission = saleAmount * (platformFeePercent / 100);
      const sellerPayout = saleAmount - ourCommission;

      const response = await authFetch(`/api/sales/${editingSale.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_name: editFormData.product_name,
          sale_amount: saleAmount,
          platform: editFormData.platform,
          sale_date: editFormData.sale_date,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update sale');
      }

      if (error) throw error;

      setSuccess('Sale updated successfully');
      setIsEditing(false);
      setEditingSale(null);
      await loadSales();
    } catch (error: any) {
      console.error('Error updating sale:', error);
      setError('Failed to update sale: ' + error.message);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDeleteSale = async (saleId: string) => {
    if (!confirm('Are you sure you want to delete this sale? This action cannot be undone.')) return;

    setIsProcessing(saleId);
    setError(null);

    try {
      const response = await authFetch(`/api/sales/${saleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete sale');
      }

      if (error) throw error;

      setSuccess('Sale deleted successfully');
      await loadSales();
    } catch (error: any) {
      console.error('Error deleting sale:', error);
      setError('Failed to delete sale: ' + error.message);
    } finally {
      setIsProcessing(null);
    }
  };

  const getStatusBadge = (sale: PlatformSale) => {
    // For platform_sales, check verification_status
    if (sale.entry_type === 'manual') {
      switch (sale.verification_status) {
        case 'verified':
          return <Badge className="bg-green-100 text-green-800 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Verified</Badge>;
        case 'pending':
          return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="w-3 h-3" /> Pending Approval</Badge>;
        case 'rejected':
          return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejected</Badge>;
        default:
          return <Badge variant="outline">{sale.verification_status}</Badge>;
      }
    }
    // For auto entries (from integrations)
    return <Badge className="bg-green-100 text-green-800">Auto</Badge>;
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total GMV</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(stats?.totalGMV ?? 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Verified sales only</p>
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
            <CardTitle className="text-sm font-medium">Verified Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSales ?? 0}</div>
            <p className="text-xs text-muted-foreground">Approved transactions</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-yellow-800">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-800">{stats?.pendingSales ?? 0}</div>
            <p className="text-xs text-yellow-600">Awaiting verification</p>
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

          {success && (
            <Alert className="mb-6 bg-green-50 border-green-200">
              <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Actions</TableHead>
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
                    <TableCell>{new Date(sale.sale_date).toLocaleDateString()}</TableCell>
                    <TableCell>{sale.sellers?.email || 'Unknown'}</TableCell>
                    <TableCell className="capitalize">{sale.platform}</TableCell>
                    <TableCell>{sale.product_name || 'Unknown'}</TableCell>
                    <TableCell className="font-medium">${sale.sale_amount?.toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(sale)}</TableCell>
                    <TableCell className="text-center">
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
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500 text-red-600 hover:bg-red-50"
                            onClick={() => setShowRejectModal(sale.id)}
                            disabled={isProcessing === sale.id}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2 justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-blue-500 text-blue-600 hover:bg-blue-50"
                            onClick={() => startEditing(sale)}
                            disabled={isProcessing === sale.id}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500 text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteSale(sale.id)}
                            disabled={isProcessing === sale.id}
                          >
                            {isProcessing === sale.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Sale Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Edit Sale
            </DialogTitle>
            <DialogDescription>
              Update the sale details below. Commission and payout will be recalculated automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="product_name">Product Name</Label>
              <Input
                id="product_name"
                value={editFormData.product_name}
                onChange={(e) => setEditFormData({ ...editFormData, product_name: e.target.value })}
                placeholder="Product name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sale_amount">Sale Amount ($)</Label>
              <Input
                id="sale_amount"
                type="number"
                step="0.01"
                min="0"
                value={editFormData.sale_amount}
                onChange={(e) => setEditFormData({ ...editFormData, sale_amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="platform">Platform</Label>
              <Select
                value={editFormData.platform}
                onValueChange={(value) => setEditFormData({ ...editFormData, platform: value ?? 'Could not determine platform.' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="whatnot">Whatnot</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sale_date">Sale Date</Label>
              <Input
                id="sale_date"
                type="date"
                value={editFormData.sale_date}
                onChange={(e) => setEditFormData({ ...editFormData, sale_date: e.target.value })}
              />
            </div>
            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              <p className="text-gray-600">
                <strong>Commission ({PLATFORM_CONFIG.PLATFORM_FEE_PERCENT}%):</strong> ${(editFormData.sale_amount * PLATFORM_CONFIG.PLATFORM_FEE_PERCENT / 100).toFixed(2)}
              </p>
              <p className="text-gray-600">
                <strong>Seller Payout:</strong> ${(editFormData.sale_amount * (100 - PLATFORM_CONFIG.PLATFORM_FEE_PERCENT) / 100).toFixed(2)}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleUpdateSale}
                disabled={isProcessing === editingSale?.id}
                className="flex-1"
              >
                {isProcessing === editingSale?.id ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setEditingSale(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
