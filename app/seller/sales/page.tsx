'use client';

import { useEffect, useState } from 'react';
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
  ShoppingBag,
  Plus,
  Calendar,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';

export default function SalesPage() {
  const router = useRouter();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [sales, setSales] = useState<PlatformSale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSale, setEditingSale] = useState<PlatformSale | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadSalesData();
  }, []);

  const getStatusBadge = (sale: PlatformSale) => {
    // For platform_sales, check verification_status
    if (sale.entry_type === 'manual') {
      switch (sale.verification_status) {
        case 'verified':
          return <Badge className="bg-green-100 text-green-800 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Verified</Badge>;
        case 'pending':
          return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
        case 'rejected':
          return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejected</Badge>;
        default:
          return <Badge variant="outline">{sale.verification_status}</Badge>;
      }
    }
    // For auto entries (from integrations)
    return <Badge className="bg-green-100 text-green-800">Auto</Badge>;
  };

  const handleDeleteSale = async (saleId: string) => {
    try {
      const res = await fetch(`/api/sales/${saleId}`, {
        method: 'DELETE',
        credentials: 'omit',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete sale');
      }

      await loadSalesData();
    } catch (error: any) {
      console.error('Error deleting sale:', error);
      setError('Failed to delete sale: ' + error.message);
    }
  };

  const loadSalesData = async () => {
    try {
      const { isSeller, isAdmin, seller: sellerData } = await checkUserStatus();

      console.log('User status check:', { isSeller, isAdmin, sellerData });

      if (!isSeller && !isAdmin) {
        router.push('/login');
        return;
      }

      setSeller(sellerData);

      if (sellerData) {
        // Use API route with JWT authentication instead of direct Supabase
        const res = await fetch('/api/sales', {
          credentials: 'omit',
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to load sales data');
        }

        const data = await res.json();
        console.log('Sales data loaded:', data.sales);
        setSales(data.sales || []);
      } else {
        console.error('No seller data found');
        throw new Error('Seller data not found');
      }
    } catch (error) {
      console.error('Error loading sales:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load sales data';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
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
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <Link href="/seller/sales/add">
          <Button className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Add Sale
          </Button>
        </Link>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="card-premium">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-muted)]">Total Sales</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{sales.length}</p>
              </div>
              <div className="p-3 bg-blue-100/20 rounded-lg">
                <ShoppingBag className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-muted)]">Total Revenue</p>
                <p className="text-2xl font-bold text-green-400">
                  ${sales.reduce((sum, s) => sum + s.sale_amount, 0).toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-green-100/20 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-muted)]">This Month</p>
                <p className="text-2xl font-bold text-purple-400">
                  ${sales
                    .filter(s => new Date(s.sale_date).getMonth() === new Date().getMonth())
                    .reduce((sum, s) => sum + s.sale_amount, 0)
                    .toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-purple-100/20 rounded-lg">
                <Calendar className="w-5 h-5 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Table */}
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="text-[var(--text-primary)]">Recent Sales</CardTitle>
          <CardDescription className="text-[var(--text-muted)]">View all your sales transactions</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--bg-raised)]">
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">Date</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">Platform</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">Product</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">Sale Amount</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id} className="border-b border-[var(--border-default)] hover:bg-[var(--row-hover)]">
                  <td className="py-3 px-4 text-left">
                    {getStatusBadge(sale)}
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--text-primary)]">
                    {new Date(sale.sale_date).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="outline" className="capitalize text-[var(--text-primary)] border-[var(--border-default)]">
                      {sale.platform}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--text-primary)]">
                    {sale.product_name || 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-medium text-green-400">
                    ${sale.sale_amount ? sale.sale_amount.toFixed(2) : '0.00'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex gap-2 justify-center">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-500 text-blue-400 hover:bg-blue-50"
                        onClick={() => {
                          setEditingSale(sale);
                          setIsEditing(true);
                        }}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500 text-red-400 hover:bg-red-50"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this sale?')) {
                            handleDeleteSale(sale.id);
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sales.length === 0 && (
            <div className="text-center py-12">
              <TrendingUp className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
              <p className="text-[var(--text-muted)]">No sales yet</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">Add your first sale to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Sale Modal */}
      {isEditing && editingSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-surface)] rounded-xl p-6 w-96 max-w-full mx-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Edit Sale</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">Product Name</label>
                <input
                  type="text"
                  className="input-premium mt-1"
                  defaultValue={editingSale.product_name || ''}
                  id="edit-product-name"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">Sale Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input-premium mt-1"
                  defaultValue={editingSale.sale_amount || ''}
                  id="edit-sale-amount"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">Platform</label>
                <select
                  className="input-premium mt-1"
                  defaultValue={editingSale.platform || ''}
                  id="edit-platform"
                >
                  <option value="whatnot">Whatnot</option>
                  <option value="youtube">YouTube Live</option>
                  <option value="meta">Meta Commerce</option>
                  <option value="tiktok">TikTok Shop (Manual)</option>
                  <option value="isellish">iSellish</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">Sale Date</label>
                <input
                  type="date"
                  className="input-premium mt-1"
                  defaultValue={editingSale.sale_date ? new Date(editingSale.sale_date).toISOString().split('T')[0] : ''}
                  id="edit-sale-date"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={async () => {
                  const productName = (document.getElementById('edit-product-name') as HTMLInputElement)?.value;
                  const saleAmount = parseFloat((document.getElementById('edit-sale-amount') as HTMLInputElement)?.value || '0');
                  const platform = (document.getElementById('edit-platform') as HTMLSelectElement)?.value;
                  const saleDate = (document.getElementById('edit-sale-date') as HTMLInputElement)?.value;
                  
                  try {
                    // Use API route with JWT authentication instead of direct Supabase
                    const res = await fetch(`/api/sales/${editingSale.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'omit',
                      body: JSON.stringify({
                        product_name: productName,
                        sale_amount: saleAmount,
                        platform: platform,
                        sale_date: saleDate,
                      }),
                    });

                    if (!res.ok) {
                      const errorData = await res.json();
                      throw new Error(errorData.error || 'Failed to update sale');
                    }

                    await loadSalesData();
                    setIsEditing(false);
                    setEditingSale(null);
                  } catch (error: any) {
                    console.error('Error updating sale:', error);
                    setError('Failed to update sale: ' + error.message);
                  }
                }}
                className="btn-primary text-sm px-4 py-2"
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditingSale(null);
                }}
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
