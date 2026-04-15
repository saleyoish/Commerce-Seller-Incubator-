'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { createClientSideSupabase, type Product, type Seller } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Video, ShoppingCart, Calendar } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function LiveShowPage() {
  const params = useParams();
  const sellerId = params.sellerId as string;

  const [seller, setSeller] = useState<Seller | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  
  // Stream config from API
  const [streamConfig, setStreamConfig] = useState<{
    streamEmbedUrl?: string;
    scheduleText?: string;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, [sellerId]);

  const loadData = async () => {
    try {
      const supabase = createClientSideSupabase();

      // Get seller info
      const { data: sellerData } = await supabase
        .from('sellers')
        .select('*')
        .eq('id', sellerId)
        .single();

      if (!sellerData || sellerData.approval_status !== 'approved') {
        setError('This seller page is not available');
        return;
      }

      setSeller(sellerData);

      // Get active products
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', sellerId)
        .eq('status', 'active')
        .gt('stock_quantity', 0)
        .order('created_at', { ascending: false });

      setProducts(productsData || []);

      // Fetch stream config from API
      try {
        const configResponse = await fetch(`/api/seller/config?sellerId=${sellerId}`);
        if (configResponse.ok) {
          const configData = await configResponse.json();
          setStreamConfig({
            streamEmbedUrl: configData.streamEmbedUrl,
            scheduleText: configData.scheduleText,
          });
        }
      } catch (configError) {
        console.error('Failed to load stream config:', configError);
      }
    } catch (error) {
      console.error('Error loading live show:', error);
      setError('Failed to load seller page');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuyNow = async () => {
    if (!selectedProduct) return;

    setCheckoutLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          quantity,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || 'Failed to initiate checkout');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Stream Section */}
      <div className="bg-black aspect-video relative">
        {streamConfig?.streamEmbedUrl ? (
          <iframe
            src={streamConfig.streamEmbedUrl}
            className="w-full h-full"
            allowFullScreen
            allow="autoplay; fullscreen"
            title="Live Stream"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h2 className="text-xl font-semibold opacity-75">Stream will appear here during live shows</h2>
              <p className="text-sm opacity-50 mt-2">Check the schedule below for upcoming streams</p>
            </div>
          </div>
        )}
        
        {/* Live Badge (when actually live in M2) */}
        <div className="absolute top-4 left-4">
          <Badge className="bg-red-600 text-white px-3 py-1">
            <span className="animate-pulse mr-2">●</span> LIVE
          </Badge>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Seller Info & Schedule */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{seller?.email}&apos;s Live Shop</h1>
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>{streamConfig?.scheduleText || seller?.schedule_text || 'Live shows: Check back for schedule'}</span>
          </div>
        </div>

        {/* Products Grid */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Available Products</h2>
          
          {products.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ShoppingCart className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No products available at the moment</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <Card key={product.id} className="overflow-hidden">
                  {/* Product Image */}
                  <div className="aspect-square relative bg-gray-100">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingCart className="h-12 w-12 text-gray-300" />
                      </div>
                    )}
                    
                    {/* Stock Badge */}
                    {product.stock_quantity <= 5 && product.stock_quantity > 0 && (
                      <Badge className="absolute top-2 right-2 bg-orange-500">
                        Only {product.stock_quantity} left!
                      </Badge>
                    )}
                  </div>

                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {product.description || 'No description'}
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-bold">${product.price.toFixed(2)}</span>
                      <Badge variant="outline">{product.category}</Badge>
                    </div>

                    <Dialog>
                      <DialogTrigger
                        render={
                          <Button 
                            className="w-full" 
                            disabled={product.stock_quantity === 0}
                            onClick={() => setSelectedProduct(product)}
                          >
                            {product.stock_quantity === 0 ? 'Out of Stock' : 'Buy Now'}
                          </Button>
                        }
                      />

                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Purchase {product.name}</DialogTitle>
                          <DialogDescription>
                            Complete your purchase securely via Stripe
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                          {product.images && product.images.length > 0 && (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-full h-48 object-cover rounded"
                            />
                          )}

                          <div className="flex justify-between items-center">
                            <span className="font-semibold">Price:</span>
                            <span className="text-xl font-bold">${product.price.toFixed(2)}</span>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="quantity">Quantity</Label>
                            <Input
                              id="quantity"
                              type="number"
                              min={1}
                              max={product.stock_quantity}
                              value={quantity}
                              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                            />
                            <p className="text-sm text-gray-500">
                              {product.stock_quantity} available
                            </p>
                          </div>

                          <div className="border-t pt-4">
                            <div className="flex justify-between items-center text-lg font-bold">
                              <span>Total:</span>
                              <span>${(product.price * quantity).toFixed(2)}</span>
                            </div>
                          </div>

                          {error && (
                            <Alert variant="destructive">
                              <AlertDescription>{error}</AlertDescription>
                            </Alert>
                          )}

                          <Button 
                            className="w-full" 
                            size="lg"
                            onClick={handleBuyNow}
                            disabled={checkoutLoading}
                          >
                            {checkoutLoading ? 'Processing...' : 'Proceed to Checkout'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
