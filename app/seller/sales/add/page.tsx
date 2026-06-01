'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientSideSupabase, type Seller, type Product } from '@/lib/supabase-client';
import { checkUserStatus } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  DollarSign,
  ShoppingBag,
  Upload,
  Info,
  ArrowLeft,
  CheckCircle,
  Calculator
} from 'lucide-react';

const PLATFORMS = [
  { id: 'whatnot', name: 'Whatnot', fee: 0.08 },
  { id: 'youtube', name: 'YouTube Live', fee: 0.30 },
  { id: 'facebook', name: 'Facebook Live', fee: 0.05 },
  { id: 'instagram', name: 'Instagram Live', fee: 0.05 },
  { id: 'tiktok', name: 'TikTok Shop (Manual)', fee: 0.02 },
];

export default function AddManualSalePage() {
  const router = useRouter();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    platform: '',
    productId: '',
    productName: '',
    saleAmount: '',
    buyerName: '',
    saleDate: new Date().toISOString().split('T')[0],
    saleTime: new Date().toTimeString().slice(0, 5),
    notes: '',
  });

  // Calculation state
  const [calculation, setCalculation] = useState({
    platformFee: 0,
    ourCommission: 0,
    sellerPayout: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Calculate commission breakdown
    const amount = parseFloat(formData.saleAmount) || 0;
    const platform = PLATFORMS.find(p => p.id === formData.platform);
    const platformFeeRate = platform?.fee || 0.05;
    
    const platformFee = amount * platformFeeRate;
    const subtotal = amount - platformFee;
    const ourCommission = subtotal * 0.15;
    const sellerPayout = subtotal - ourCommission;

    setCalculation({
      platformFee: Number(platformFee.toFixed(2)),
      ourCommission: Number(ourCommission.toFixed(2)),
      sellerPayout: Number(sellerPayout.toFixed(2)),
    });
  }, [formData.saleAmount, formData.platform]);

  const loadData = async () => {
    try {
      const supabase = createClientSideSupabase();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: sellerData } = await supabase
        .from('sellers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // Check if user is admin (admins can access without seller record)
      const { data: adminData } = await supabase
        .from('admins')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!sellerData && !adminData) {

      
        router.push('/signup');
        return;
      }

      setSeller(sellerData);

      // Get products (only if seller exists)
      if (sellerData) {
        const { data: productsData } = await supabase
          .from('products')
          .select('*')
          .eq('seller_id', sellerData.id)
          .eq('status', 'active');

        setProducts(productsData || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[Sale Submit] Starting submission...');
    console.log('[Sale Submit] Seller:', seller);
    
    if (!seller) {
      console.error('[Sale Submit] No seller found!');
      setError('You must be logged in as a seller to submit sales');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const supabase = createClientSideSupabase();

      // Validate
      if (!formData.platform || !formData.saleAmount || parseFloat(formData.saleAmount) <= 0) {
        throw new Error('Please fill in all required fields');
      }

      // Combine date and time
      const saleDateTime = new Date(`${formData.saleDate}T${formData.saleTime}`);

      const saleData = {
        seller_id: seller.id,
        platform: formData.platform,
        product_id: formData.productId || null,
        product_name: formData.productName || null,
        sale_amount: parseFloat(formData.saleAmount),
        platform_fee: calculation.platformFee,
        our_commission: calculation.ourCommission,
        seller_payout: calculation.sellerPayout,
        sale_date: saleDateTime.toISOString(),
        buyer_info: { name: formData.buyerName },
        entry_type: 'manual',
        verification_status: 'pending',
        notes: formData.notes,
      };
      
      console.log('[Sale Submit] Inserting data:', saleData);

      const { data, error: submitError } = await supabase
        .from('platform_sales')
        .insert(saleData)
        .select();

      if (submitError) {
        console.error('[Sale Submit] Insert error:', submitError);
        throw submitError;
      }

      console.log('[Sale Submit] Success! Inserted:', data);
      setSuccess(true);
      
      // Reset form
      setFormData({
        platform: '',
        productId: '',
        productName: '',
        saleAmount: '',
        buyerName: '',
        saleDate: new Date().toISOString().split('T')[0],
        saleTime: new Date().toTimeString().slice(0, 5),
        notes: '',
      });

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/seller/earnings');
      }, 2000);
    } catch (error: any) {
      console.error('Error submitting sale:', error);
      setError(error.message || 'Failed to submit sale');
    } finally {
      setIsSubmitting(false);
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
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <button 
          onClick={() => router.push('/seller/earnings')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Earnings
        </button>
        <h1 className="text-3xl font-bold mb-2">Log a Sale</h1>
        <p className="text-gray-600">Manually record a sale from any platform</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
          <AlertDescription className="text-green-800">
            Sale submitted successfully! Redirecting to earnings...
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Sale Details
          </CardTitle>
          <CardDescription>
            This sale will be marked as &quot;pending verification&quot; until an admin reviews it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Platform Selection */}
            <div className="space-y-2">
              <Label htmlFor="platform">Platform *</Label>
              <select
                id="platform"
                value={formData.platform}
                onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                className="w-full px-3 py-2 border rounded-md bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-default)] focus:border-[var(--accent-primary)] focus:outline-none"
                required
              >
                <option value="" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">Select a platform</option>
                {PLATFORMS.map((platform) => (
                  <option key={platform.id} value={platform.id} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                    {platform.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Selection */}
            <div className="space-y-2">
              <Label>Product (Optional)</Label>
              <select
                value={formData.productId}
                onChange={(e) => {
                  const product = products.find(p => p.id === e.target.value);
                  setFormData({ 
                    ...formData, 
                    productId: e.target.value,
                    productName: product?.name || '',
                    saleAmount: product?.price.toString() || formData.saleAmount,
                  });
                }}
                className="w-full px-3 py-2 border rounded-md bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-default)] focus:border-[var(--accent-primary)] focus:outline-none"
              >
                <option value="" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">Select from your products...</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                    {product.name} - ${product.price}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500">
                Or enter product name manually below
              </p>
            </div>

            {/* Product Name (if not selected from list) */}
            <div className="space-y-2">
              <Label htmlFor="productName">Product Name</Label>
              <Input
                id="productName"
                placeholder="What was sold?"
                value={formData.productName}
                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
              />
            </div>

            {/* Sale Amount */}
            <div className="space-y-2">
              <Label htmlFor="saleAmount">Sale Amount *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  id="saleAmount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  className="pl-10"
                  value={formData.saleAmount}
                  onChange={(e) => setFormData({ ...formData, saleAmount: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Commission Calculator Preview */}
            {parseFloat(formData.saleAmount) > 0 && formData.platform && (
              <div className="bg-[var(--bg-raised)] border border-[var(--border-default)] p-4 rounded-lg">
                <h4 className="font-medium mb-3 flex items-center text-[var(--text-primary)]">
                  <Calculator className="w-4 h-4 mr-2" />
                  Commission Breakdown
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-[var(--text-secondary)]">
                    <span>Sale Amount:</span>
                    <span className="font-medium text-[var(--text-primary)]">${parseFloat(formData.saleAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-red-400">
                    <span>Platform Fee ({(PLATFORMS.find(p => p.id === formData.platform)?.fee || 0.05) * 100}%):</span>
                    <span>-${calculation.platformFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-orange-400">
                    <span>Platform Commission (15%):</span>
                    <span>-${calculation.ourCommission.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-[var(--border-default)] pt-2 flex justify-between text-green-400 font-semibold">
                    <span>Your Payout:</span>
                    <span>${calculation.sellerPayout.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Buyer Name */}
            <div className="space-y-2">
              <Label htmlFor="buyerName">Buyer Name (Optional)</Label>
              <Input
                id="buyerName"
                placeholder="Who bought this?"
                value={formData.buyerName}
                onChange={(e) => setFormData({ ...formData, buyerName: e.target.value })}
              />
            </div>

            {/* Sale Date/Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="saleDate">Sale Date *</Label>
                <Input
                  id="saleDate"
                  type="date"
                  value={formData.saleDate}
                  onChange={(e) => setFormData({ ...formData, saleDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="saleTime">Sale Time *</Label>
                <Input
                  id="saleTime"
                  type="time"
                  value={formData.saleTime}
                  onChange={(e) => setFormData({ ...formData, saleTime: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Receipt Upload (Placeholder) */}
            <div className="space-y-2">
              <Label>Receipt/Proof (Optional)</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 cursor-pointer">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  Upload receipt, screenshot, or proof of sale
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Supports: JPG, PNG, PDF (max 5MB)
                </p>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional information..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            {/* Info Alert */}
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-800 text-sm">
                This sale will be held in &quot;pending&quot; status until an admin verifies it. 
                You&apos;ll receive an email once it&apos;s approved.
              </AlertDescription>
            </Alert>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <Button 
                type="submit" 
                disabled={isSubmitting || success}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    Submit Sale
                  </>
                )}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.push('/seller/earnings')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
