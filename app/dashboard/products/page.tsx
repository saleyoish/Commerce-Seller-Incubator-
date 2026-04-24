'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClientSideSupabase, type Seller, type Product } from '@/lib/supabase-client';
import { PLATFORM_CONFIG } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { X, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  price: z.string().min(1, 'Price is required'),
  category: z.string().min(1, 'Category is required'),
  stock_quantity: z.string().min(1, 'Stock quantity is required'),
});

type ProductFormData = z.infer<typeof productSchema>;

export default function ProductsPage() {
  const router = useRouter();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  const selectedCategory = watch('category');

  useEffect(() => {
    loadData();
  }, []);

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
        .single();

      if (!sellerData) {
        router.push('/signup');
        return;
      }

      setSeller(sellerData);

      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', sellerData.id)
        .order('created_at', { ascending: false });

      setProducts(productsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file size
    const validFiles = files.filter(file => {
      if (file.size > PLATFORM_CONFIG.MAX_IMAGE_SIZE_MB * 1024 * 1024) {
        setError(`File ${file.name} exceeds ${PLATFORM_CONFIG.MAX_IMAGE_SIZE_MB}MB limit`);
        return false;
      }
      if (!PLATFORM_CONFIG.ALLOWED_IMAGE_TYPES.includes(file.type as any)) {
        setError(`File ${file.name} is not a valid image type`);
        return false;
      }
      return true;
    });

    if (images.length + validFiles.length > PLATFORM_CONFIG.MAX_IMAGES_PER_PRODUCT) {
      setError(`Maximum ${PLATFORM_CONFIG.MAX_IMAGES_PER_PRODUCT} images allowed`);
      return;
    }

    setImages(prev => [...prev, ...validFiles]);
    
    // Create preview URLs
    const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file));
    setImagePreviewUrls(prev => [...prev, ...newPreviewUrls]);
    setError(null);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(imagePreviewUrls[index]);
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (productId: string): Promise<string[]> => {
    if (images.length === 0) return [];

    const supabase = createClientSideSupabase();
    const imageUrls: string[] = [];

    for (const image of images) {
      const fileName = `${productId}/${Date.now()}-${image.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, image);

      if (uploadError) {
        throw new Error(`Failed to upload ${image.name}: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      imageUrls.push(publicUrl);
    }

    return imageUrls;
  };

  const onSubmit = async (data: ProductFormData) => {
    if (!seller) return;

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClientSideSupabase();

      // Create product first
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          seller_id: seller.id,
          name: data.name,
          description: data.description || null,
          price: parseFloat(data.price),
          category: data.category,
          stock_quantity: parseInt(data.stock_quantity),
          status: 'active',
        })
        .select()
        .single();

      if (productError || !product) {
        throw new Error(productError?.message || 'Failed to create product');
      }

      // Upload images if any
      let imageUrls: string[] = [];
      if (images.length > 0) {
        imageUrls = await uploadImages(product.id);
      }

      // Update product with image URLs
      if (imageUrls.length > 0) {
        await supabase
          .from('products')
          .update({ images: imageUrls })
          .eq('id', product.id);
      }

      // Reset form
      reset();
      setImages([]);
      imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
      setImagePreviewUrls([]);

      // Refresh products list
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create product');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const supabase = createClientSideSupabase();
      await supabase.from('products').delete().eq('id', productId);
      loadData();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="pill pill-success">Active</span>;
      case 'inactive':
        return <span className="pill pill-pending">Inactive</span>;
      case 'deleted':
        return <span className="pill pill-suspended">Deleted</span>;
      default:
        return <span className="pill pill-pending">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Manage Products</h1>
        <p className="text-[var(--text-muted)] mt-1">Upload and manage your products for live selling</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Add Product Form */}
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Add New Product</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">Upload a new product to sell</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert className="mb-4 bg-[rgba(239,68,68,0.1)] border-[var(--accent-danger)] text-[var(--accent-danger)]">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[var(--text-secondary)]">Product Name</Label>
                <Input 
                  id="name" 
                  {...register('name')} 
                  className="input-premium"
                />
                {errors.name && (
                  <p className="text-sm text-[var(--accent-danger)]">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-[var(--text-secondary)]">Description</Label>
                <Input 
                  id="description" 
                  {...register('description')} 
                  className="input-premium"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price" className="text-[var(--text-secondary)]">Price ($)</Label>
                <Input 
                  id="price" 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  {...register('price')} 
                  className="input-premium"
                />
                {errors.price && (
                  <p className="text-sm text-[var(--accent-danger)]">{errors.price.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="text-[var(--text-secondary)]">Category</Label>
                <Select value={selectedCategory || ''} onValueChange={(value) => setValue('category', value || '')}>
                  <SelectTrigger className="input-premium">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--bg-surface)] border-[var(--border-default)]">
                    {PLATFORM_CONFIG.PRODUCT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-[var(--text-primary)] focus:bg-[var(--bg-raised)]">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-sm text-[var(--accent-danger)]">{errors.category.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock_quantity" className="text-[var(--text-secondary)]">Stock Quantity</Label>
                <Input 
                  id="stock_quantity" 
                  type="number" 
                  min="0" 
                  {...register('stock_quantity')} 
                  className="input-premium"
                />
                {errors.stock_quantity && (
                  <p className="text-sm text-[var(--accent-danger)]">{errors.stock_quantity.message}</p>
                )}
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label htmlFor="images" className="text-[var(--text-secondary)]">Product Images (up to {PLATFORM_CONFIG.MAX_IMAGES_PER_PRODUCT})</Label>
                <div className="border-2 border-dashed border-[var(--border-default)] rounded-lg p-4 hover:border-[var(--accent-primary)] transition-colors">
                  <input
                    type="file"
                    id="images"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="images"
                    className="flex flex-col items-center cursor-pointer"
                  >
                    <Upload className="h-8 w-8 text-[var(--text-muted)] mb-2" />
                    <span className="text-sm text-[var(--text-secondary)]">Click to upload images</span>
                    <span className="text-xs text-[var(--text-muted)] mt-1">
                      Max {PLATFORM_CONFIG.MAX_IMAGE_SIZE_MB}MB per image
                    </span>
                  </label>
                </div>

                {/* Image Previews */}
                {imagePreviewUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {imagePreviewUrls.map((url, index) => (
                      <div key={index} className="relative">
                        <img
                          src={url}
                          alt={`Preview ${index + 1}`}
                          className="w-20 h-20 object-cover rounded border border-[var(--border-default)]"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-1 -right-1 bg-[var(--accent-danger)] text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full btn-primary" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </span>
                ) : (
                  'Add Product'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Products List */}
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Your Products</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">Manage your existing products</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[var(--border-default)] hover:bg-transparent">
                    <TableHead className="text-[var(--text-muted)]">Image</TableHead>
                    <TableHead className="text-[var(--text-muted)]">Name</TableHead>
                    <TableHead className="text-[var(--text-muted)]">Price</TableHead>
                    <TableHead className="text-[var(--text-muted)]">Stock</TableHead>
                    <TableHead className="text-[var(--text-muted)]">Status</TableHead>
                    <TableHead className="text-[var(--text-muted)]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-[var(--text-muted)] py-8">
                        No products yet. Add your first product!
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.map((product) => (
                      <TableRow key={product.id} className="border-[var(--border-default)] hover:bg-[var(--row-hover)]">
                        <TableCell>
                          {product.images && product.images.length > 0 ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded border border-[var(--border-default)]"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-[var(--bg-raised)] rounded flex items-center justify-center border border-[var(--border-default)]">
                              <ImageIcon className="h-6 w-6 text-[var(--text-muted)]" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-[var(--text-primary)]">{product.name}</TableCell>
                        <TableCell className="text-[var(--text-secondary)]">${product.price.toFixed(2)}</TableCell>
                        <TableCell className="text-[var(--text-secondary)]">{product.stock_quantity}</TableCell>
                        <TableCell>{getStatusBadge(product.status)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteProduct(product.id)}
                            className="text-[var(--accent-danger)] hover:bg-[rgba(239,68,68,0.1)]"
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
