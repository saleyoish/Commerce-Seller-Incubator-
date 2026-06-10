'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Package, 
  Tag, 
  Plus, 
  Trash2,
  AlertCircle
} from 'lucide-react';
import { loadCategories, saveCategories, addCategory, deleteCategory, type Category } from '@/lib/categories';
import { PLATFORM_CONFIG } from '@/lib/config';

export default function CategoriesSettingsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load categories from localStorage on mount
  useEffect(() => {
    const loaded = loadCategories();
    setCategories(loaded);
    setIsLoaded(true);
  }, []);

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      const updated = addCategory(newCategory);
      setCategories(updated);
      setNewCategory('');
    }
  };

  const handleDeleteCategory = (id: string) => {
    const updated = deleteCategory(id);
    setCategories(updated);
  };

  // Prevent hydration mismatch
  if (!isLoaded) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-[var(--text-primary)]">Categories</h1>
          <p className="text-[var(--text-muted)]">Manage your custom product categories</p>
        </div>
        <Card className="card-premium">
          <CardContent className="p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-[var(--bg-raised)] rounded w-full"></div>
              <div className="space-y-2">
                <div className="h-12 bg-[var(--bg-raised)] rounded"></div>
                <div className="h-12 bg-[var(--bg-raised)] rounded"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-6">
        {/* Default Categories Info */}
        <Card className="card-premium border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium text-[var(--text-primary)]">Default Categories</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  These are the built-in categories: {PLATFORM_CONFIG.PRODUCT_CATEGORIES.join(', ')}.
                  You can add custom categories below to better organize your products.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Category */}
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)] flex items-center gap-2">
              <Plus className="w-5 h-5 text-[var(--accent-primary)]" />
              Add New Category
            </CardTitle>
            <CardDescription className="text-[var(--text-muted)]">
              Create custom categories to organize your products
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter category name..."
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="flex-1 bg-[var(--bg-input)] border-[var(--border-default)] text-[var(--text-primary)]"
                onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
              />
              <Button 
                onClick={handleAddCategory}
                className="btn-primary flex items-center gap-2"
                disabled={!newCategory.trim()}
              >
                <Plus className="w-4 h-4" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Categories List */}
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)] flex items-center gap-2">
              <Tag className="w-5 h-5 text-[var(--accent-primary)]" />
              Your Categories
            </CardTitle>
            <CardDescription className="text-[var(--text-muted)]">
              {categories.length} total categories ({PLATFORM_CONFIG.PRODUCT_CATEGORIES.length} default + {categories.length - PLATFORM_CONFIG.PRODUCT_CATEGORIES.length} custom)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {categories.length === 0 ? (
                <p className="text-center py-4 text-[var(--text-muted)]">
                  No categories yet. Create one above.
                </p>
              ) : (
                categories.map((category) => {
                  const isDefault = PLATFORM_CONFIG.PRODUCT_CATEGORIES.includes(category.name as any);
                  return (
                    <div 
                      key={category.id} 
                      className="flex items-center justify-between p-3 bg-[var(--bg-raised)] rounded-lg border border-[var(--border-default)]"
                    >
                      <div className="flex items-center gap-3">
                        <Tag className="w-4 h-4 text-[var(--accent-primary)]" />
                        <span className="font-medium text-[var(--text-primary)]">{category.name}</span>
                        {isDefault ? (
                          <Badge variant="outline" className="text-xs border-blue-300 text-blue-400">
                            Default
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-[var(--text-muted)] border-[var(--border-default)]">
                            Custom
                          </Badge>
                        )}
                      </div>
                      {!isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-[var(--accent-danger)] hover:bg-[rgba(239,68,68,0.1)]"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Products Link */}
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)] flex items-center gap-2">
              <Package className="w-5 h-5 text-[var(--accent-primary)]" />
              Products
            </CardTitle>
            <CardDescription className="text-[var(--text-muted)]">
              Manage your products and assign categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a 
              href="/seller/products"
              className="flex items-center justify-between p-4 border border-[var(--border-default)] rounded-lg hover:bg-[var(--bg-raised)] transition-colors"
            >
              <div>
                <p className="font-medium text-[var(--text-primary)]">Go to Products</p>
                <p className="text-sm text-[var(--text-muted)]">
                  Add or edit products and assign them to these categories
                </p>
              </div>
              <Package className="w-5 h-5 text-[var(--text-muted)]" />
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
