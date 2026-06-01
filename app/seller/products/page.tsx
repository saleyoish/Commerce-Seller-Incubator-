'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClientSideSupabase, type Seller, type Product } from '@/lib/supabase-client';
import { checkUserStatus } from '@/lib/auth';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { X, Upload, Image as ImageIcon, Loader2, Plus, FileUp, Search, Edit, Save } from 'lucide-react';
import { getCategoryNames } from '@/lib/categories';

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
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    price: 0,
    stock_quantity: 0,
    category: '',
    status: 'active' as 'active' | 'inactive',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  // Load custom categories on mount
  useEffect(() => {
    const customCategories = getCategoryNames();
    // Merge with platform config categories to ensure we always have options
    const merged = [...new Set([...PLATFORM_CONFIG.PRODUCT_CATEGORIES, ...customCategories])];
    setCategories(merged);
  }, []);

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
      setIsLoading(true);
      // Check user status via API (avoids RLS issues)
      const { isSeller, isAdmin, seller: sellerData } = await checkUserStatus();
      
      if (!isSeller && !isAdmin) {
        router.push('/login');
        return;
      }

      setSeller(sellerData);

      // Get products (only if seller exists)
      if (sellerData) {
        const supabase = createClientSideSupabase();
        const { data: productsData } = await supabase
          .from('products')
          .select('*')
          .eq('seller_id', sellerData.id)
          .order('created_at', { ascending: false });

        setProducts(productsData || []);
        setFilteredProducts(productsData || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Search filter
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  }, [searchQuery, products]);

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

      // Close dialog and refresh
      setAddDialogOpen(false);
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

  const startEditing = (product: Product) => {
    setEditingProduct(product);
    setEditFormData({
      name: product.name,
      description: product.description || '',
      price: product.price,
      stock_quantity: product.stock_quantity,
      category: product.category || '',
      status: product.status === 'deleted' ? 'inactive' : (product.status as 'active' | 'inactive'),
    });
    setEditDialogOpen(true);
    setError(null);
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct || !seller) return;

    setIsEditing(true);
    setError(null);

    try {
      const supabase = createClientSideSupabase();
      const { error } = await supabase
        .from('products')
        .update({
          name: editFormData.name,
          description: editFormData.description || null,
          price: editFormData.price,
          stock_quantity: editFormData.stock_quantity,
          category: editFormData.category || null,
          status: editFormData.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingProduct.id);

      if (error) throw error;

      setEditDialogOpen(false);
      setEditingProduct(null);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update product');
    } finally {
      setIsEditing(false);
    }
  };

  // CSV Import handler
  const handleCsvImport = async () => {
    if (!csvFile || !seller) return;

    setImportLoading(true);
    setError(null);

    try {
      const text = await csvFile.text();
      const rows = text.split('\n').filter(row => row.trim());
      const headers = rows[0].split(',').map(h => h.trim().toLowerCase());

      // Validate headers
      const requiredHeaders = ['name', 'price', 'category', 'stock_quantity'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
      }

      const supabase = createClientSideSupabase();
      const productsToInsert = [];

      for (let i = 1; i < rows.length; i++) {
        const values = rows[i].split(',').map(v => v.trim());
        const product: any = { seller_id: seller.id, status: 'active' };

        headers.forEach((header, index) => {
          if (values[index]) {
            if (header === 'price') {
              product[header] = parseFloat(values[index]);
            } else if (header === 'stock_quantity') {
              product[header] = parseInt(values[index]);
            } else {
              product[header] = values[index];
            }
          }
        });

        if (product.name && product.price) {
          productsToInsert.push(product);
        }
      }

      if (productsToInsert.length === 0) {
        throw new Error('No valid products found in CSV');
      }

      const { error: insertError } = await supabase
        .from('products')
        .insert(productsToInsert);

      if (insertError) throw insertError;

      setCsvFile(null);
      setImportDialogOpen(false);
      loadData();
      alert(`Successfully imported ${productsToInsert.length} products!`);
    } catch (err: any) {
      setError(err.message || 'Failed to import CSV');
    } finally {
      setImportLoading(false);
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
      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <Input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64 input-premium"
            />
          </div>

          {/* Import CSV Dialog */}
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => setImportDialogOpen(true)}
            >
              <FileUp className="w-4 h-4" />
              Import
            </Button>
            <DialogContent className="sm:max-w-md bg-[var(--bg-surface)]">
              <DialogHeader>
                <DialogTitle className="text-[var(--text-primary)]">Import Products from CSV</DialogTitle>
                <DialogDescription className="text-[var(--text-muted)]">
                  Upload a CSV file with columns: name, price, category, stock_quantity, description (optional)
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {error && importDialogOpen && (
                  <Alert className="bg-[rgba(239,68,68,0.1)] border-[var(--accent-danger)] text-[var(--accent-danger)]">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="border-2 border-dashed border-[var(--border-default)] rounded-lg p-6 hover:border-[var(--accent-primary)] transition-colors">
                  <input
                    type="file"
                    id="csv-file"
                    accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <label htmlFor="csv-file" className="flex flex-col items-center cursor-pointer">
                    <FileUp className="h-8 w-8 text-[var(--text-muted)] mb-2" />
                    <span className="text-sm text-[var(--text-secondary)]">
                      {csvFile ? csvFile.name : 'Click to select CSV file'}
                    </span>
                  </label>
                </div>
                <Button
                  onClick={handleCsvImport}
                  className="w-full btn-primary"
                  disabled={!csvFile || importLoading}
                >
                  {importLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Importing...
                    </span>
                  ) : (
                    'Import Products'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Add Product Dialog */}
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <Button 
              className="btn-primary gap-2"
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Add Product
            </Button>
            <DialogContent className="sm:max-w-lg bg-[var(--bg-surface)] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-[var(--text-primary)]">Add New Product</DialogTitle>
                <DialogDescription className="text-[var(--text-muted)]">
                  Upload a new product to sell
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                {error && addDialogOpen && (
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

                  <div className="grid grid-cols-2 gap-4">
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
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-[var(--text-secondary)]">Category</Label>
                    <Select value={selectedCategory || ''} onValueChange={(value) => setValue('category', value || '')}>
                      <SelectTrigger className="input-premium">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="bg-[var(--bg-surface)] border-[var(--border-default)]">
                        {categories.map((cat) => (
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
                      <label htmlFor="images" className="flex flex-col items-center cursor-pointer">
                        <Upload className="h-8 w-8 text-[var(--text-muted)] mb-2" />
                        <span className="text-sm text-[var(--text-secondary)]">Click to upload images</span>
                        <span className="text-xs text-[var(--text-muted)] mt-1">
                          Max {PLATFORM_CONFIG.MAX_IMAGE_SIZE_MB}MB per image
                        </span>
                      </label>
                    </div>

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

                  <Button type="submit" className="w-full btn-primary" disabled={isLoading}>
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
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Products List - Full Width */}
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="text-[var(--text-primary)]">Your Products ({filteredProducts.length})</CardTitle>
          <CardDescription className="text-[var(--text-muted)]">Manage your existing products</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--border-default)] hover:bg-transparent">
                  <TableHead className="text-[var(--text-muted)]">Image</TableHead>
                  <TableHead className="text-[var(--text-muted)]">Name</TableHead>
                  <TableHead className="text-[var(--text-muted)]">Category</TableHead>
                  <TableHead className="text-[var(--text-muted)]">Price</TableHead>
                  <TableHead className="text-[var(--text-muted)]">Stock</TableHead>
                  <TableHead className="text-[var(--text-muted)]">Status</TableHead>
                  <TableHead className="text-[var(--text-muted)]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, index) => (
                    <TableRow key={index} className="border-[var(--border-default)] animate-pulse">
                      <TableCell>
                        <div className="w-12 h-12 bg-slate-200 rounded border border-[var(--border-default)]" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-32 bg-slate-200 rounded" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-20 bg-slate-200 rounded" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-14 bg-slate-200 rounded" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-10 bg-slate-200 rounded" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-16 bg-slate-200 rounded" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-20 bg-slate-200 rounded" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-[var(--text-muted)] py-8">
                      {searchQuery ? 'No products match your search' : 'No products yet. Add your first product!'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
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
                      <TableCell className="text-[var(--text-secondary)]">{product.category || '-'}</TableCell>
                      <TableCell className="text-[var(--text-secondary)]">${product.price.toFixed(2)}</TableCell>
                      <TableCell className="text-[var(--text-secondary)]">{product.stock_quantity}</TableCell>
                      <TableCell>{getStatusBadge(product.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditing(product)}
                            className="text-[var(--accent-primary)] hover:bg-[rgba(124,58,237,0.1)]"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteProduct(product.id)}
                            className="text-[var(--accent-danger)] hover:bg-[rgba(239,68,68,0.1)]"
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Product Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-[var(--bg-surface)] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[var(--text-primary)] flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Edit Product
            </DialogTitle>
            <DialogDescription className="text-[var(--text-muted)]">
              Update your product details
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {error && (
              <Alert className="bg-[rgba(239,68,68,0.1)] border-[var(--accent-danger)] text-[var(--accent-danger)]">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit_name" className="text-[var(--text-secondary)]">Product Name</Label>
              <Input
                id="edit_name"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="input-premium"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_description" className="text-[var(--text-secondary)]">Description</Label>
              <Input
                id="edit_description"
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                className="input-premium"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_price" className="text-[var(--text-secondary)]">Price ($)</Label>
                <Input
                  id="edit_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editFormData.price}
                  onChange={(e) => setEditFormData({ ...editFormData, price: parseFloat(e.target.value) || 0 })}
                  className="input-premium"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_stock" className="text-[var(--text-secondary)]">Stock Quantity</Label>
                <Input
                  id="edit_stock"
                  type="number"
                  min="0"
                  value={editFormData.stock_quantity}
                  onChange={(e) => setEditFormData({ ...editFormData, stock_quantity: parseInt(e.target.value) || 0 })}
                  className="input-premium"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_category" className="text-[var(--text-secondary)]">Category</Label>
              <Select
                value={editFormData.category}
                onValueChange={(value) => setEditFormData({ ...editFormData, category: value || '' })}
              >
                <SelectTrigger className="input-premium">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-[var(--bg-surface)] border-[var(--border-default)]">
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-[var(--text-primary)] focus:bg-[var(--bg-raised)]">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_status" className="text-[var(--text-secondary)]">Status</Label>
              <Select
                value={editFormData.status}
                onValueChange={(value) => {
                  if (value) setEditFormData({ ...editFormData, status: value as 'active' | 'inactive' });
                }}
              >
                <SelectTrigger className="input-premium">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-[var(--bg-surface)] border-[var(--border-default)]">
                  <SelectItem value="active" className="text-[var(--text-primary)] focus:bg-[var(--bg-raised)]">Active</SelectItem>
                  <SelectItem value="inactive" className="text-[var(--text-primary)] focus:bg-[var(--bg-raised)]">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleUpdateProduct}
                disabled={isEditing}
                className="flex-1 btn-primary"
              >
                {isEditing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditDialogOpen(false);
                  setEditingProduct(null);
                  setError(null);
                }}
                className="border-[var(--border-default)]"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
