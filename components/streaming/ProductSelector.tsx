'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Package, DollarSign, Star } from 'lucide-react';
import { createClientSideSupabase, type Product, type Seller } from '@/lib/supabase-client';
import { checkUserStatus } from '@/lib/auth';

interface ProductSelectorProps {
  selectedProducts: string[];
  onSelectionChange: (productIds: string[]) => void;
  maxProducts?: number;
}

export function ProductSelector({ 
  selectedProducts, 
  onSelectionChange, 
  maxProducts = 10 
}: ProductSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [seller, setSeller] = useState<Seller | null>(null);

  // Load seller data
  useEffect(() => {
    const loadSeller = async () => {
      try {
        const { isSeller, seller: sellerData } = await checkUserStatus();
        if (isSeller && sellerData) {
          setSeller(sellerData);
        }
      } catch (error) {
        console.error('Failed to load seller:', error);
      }
    };
    loadSeller();
  }, []);

  // Load products from database
  useEffect(() => {
    if (seller) {
      loadProducts();
    }
  }, [seller]);

  // Filter products based on search
  useEffect(() => {
    const filtered = products.filter(product => 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [products, searchTerm]);

  const loadProducts = async () => {
    if (!seller) return;
    
    try {
      setLoading(true);
      const supabase = createClientSideSupabase();
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', seller.id)
        .eq('status', 'active');

      setProducts(productsData || []);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleProduct = (productId: string) => {
    const newSelection = selectedProducts.includes(productId)
      ? selectedProducts.filter(id => id !== productId)
      : [...selectedProducts, productId];
    
    onSelectionChange(newSelection.slice(0, maxProducts));
  };

  const generateStreamLink = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return '';
    
    // Generate TikTok shop product link
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
    return `${baseUrl}/product/${productId}`;
  };

  const getSelectedProductsInfo = () => {
    return selectedProducts.map(id => products.find(p => p.id === id)).filter(Boolean) as Product[];
  };

  const selectedProductsInfo = getSelectedProductsInfo();
  const totalValue = selectedProductsInfo.reduce((sum, p) => sum + (p?.price || 0), 0);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button variant="outline" className="w-full" onClick={() => setIsOpen(true)}>
        <Package className="w-4 h-4 mr-2" />
        Select Products ({selectedProducts.length}/{maxProducts})
      </Button>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Select Products for Stream
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Selected Products Summary */}
          {selectedProducts.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">
                Selected Products ({selectedProducts.length})
              </h3>
              <div className="space-y-2">
                {selectedProductsInfo.map((product) => (
                  product && (
                    <div key={product.id} className="flex items-center justify-between bg-white p-2 rounded border">
                      <div className="flex items-center gap-2">
                        {product.images && product.images.length > 0 && (
                          <img 
                            src={product.images[0]} 
                            alt={product.name}
                            className="w-8 h-8 object-cover rounded"
                          />
                        )}
                        <div>
                          <p className="font-medium text-sm">{product.name}</p>
                          <p className="text-xs text-gray-500">${product.price}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleProduct(product.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  )
                ))}
              </div>
              <div className="mt-2 pt-2 border-t">
                <p className="text-sm font-semibold text-blue-900">
                  Total Value: ${totalValue.toFixed(2)}
                </p>
              </div>
            </div>
          )}

          {/* Product List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              <>
                {[...Array(6)].map((_, index) => (
                  <div key={index} className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm animate-pulse">
                    <div className="h-32 rounded-lg bg-slate-200" />
                    <div className="h-4 w-3/4 rounded bg-slate-200" />
                    <div className="h-4 w-1/2 rounded bg-slate-200" />
                    <div className="h-8 w-full rounded-full bg-slate-200" />
                  </div>
                ))}
              </>
            ) : filteredProducts.length === 0 ? (
              <div className="col-span-full text-center py-8">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">
                  {searchTerm ? 'No products found matching your search' : 'No products available'}
                </p>
              </div>
            ) : (
              filteredProducts.map((product) => {
                const isSelected = selectedProducts.includes(product.id);
                const streamLink = generateStreamLink(product.id);
                
                return (
                  <div 
                    key={product.id} 
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => toggleProduct(product.id)}
                  >
                    <div className="space-y-3">
                      {/* Product Image */}
                      {product.images && product.images.length > 0 && (
                        <div className="relative">
                          <img 
                            src={product.images[0]} 
                            alt={product.name}
                            className="w-full h-32 object-cover rounded"
                          />
                          {isSelected && (
                            <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                              <Package className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Product Info */}
                      <div>
                        <h3 className="font-semibold text-sm line-clamp-2">{product.name}</h3>
                        {product.description && (
                          <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                            {product.description}
                          </p>
                        )}
                        
                        {/* Price */}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-green-600">${product.price}</span>
                          </div>
                          
                          <Badge variant="secondary" className="text-xs">
                            {product.category}
                          </Badge>
                        </div>

                        {/* Stream Link */}
                        {streamLink && (
                          <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                            <p className="font-medium text-gray-700">Stream Link:</p>
                            <p className="text-blue-600 break-all">{streamLink}</p>
                          </div>
                        )}
                      </div>

                      {/* Selection Checkbox */}
                      <div className="flex items-center gap-2 mt-3">
                        <input
                          type="checkbox"
                          id={`product-${product.id}`}
                          checked={isSelected}
                          onChange={() => toggleProduct(product.id)}
                          className="rounded border-gray-300"
                        />
                        <Label 
                          htmlFor={`product-${product.id}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {isSelected ? 'Selected for Stream' : 'Add to Stream'}
                        </Label>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Instructions */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-900 mb-2">💡 Stream Tips:</h4>
            <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
              <li>Select up to {maxProducts} products to feature in your stream</li>
              <li>Product links will be automatically added to your stream description</li>
              <li>Viewers can click links to purchase products while watching</li>
              <li>Track sales and performance in your dashboard</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              onClick={() => setIsOpen(false)}
              className="flex-1"
              disabled={selectedProducts.length === 0}
            >
              Confirm Selection ({selectedProducts.length} products)
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
