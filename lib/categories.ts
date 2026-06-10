// Custom categories management - stores categories in localStorage
// so they're persisted across sessions and available when adding products

const CATEGORIES_STORAGE_KEY = 'seller_custom_categories';

export interface Category {
  id: string;
  name: string;
  count: number;
}

// Default categories
export const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: 'Fashion', count: 0 },
  { id: '2', name: 'Electronics', count: 0 },
  { id: '3', name: 'Beauty', count: 0 },
  { id: '4', name: 'Home', count: 0 },
  { id: '5', name: 'Other', count: 0 },
];

// Load categories from localStorage
export function loadCategories(): Category[] {
  if (typeof window === 'undefined') return DEFAULT_CATEGORIES;
  
  try {
    const stored = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading categories:', e);
  }
  return DEFAULT_CATEGORIES;
}

// Save categories to localStorage
export function saveCategories(categories: Category[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
  } catch (e) {
    console.error('Error saving categories:', e);
  }
}

// Add a new category
export function addCategory(name: string): Category[] {
  const categories = loadCategories();
  const newCategory: Category = {
    id: Date.now().toString(),
    name: name.trim(),
    count: 0,
  };
  const updated = [...categories, newCategory];
  saveCategories(updated);
  return updated;
}

// Delete a category
export function deleteCategory(id: string): Category[] {
  const categories = loadCategories();
  const updated = categories.filter(c => c.id !== id);
  saveCategories(updated);
  return updated;
}

// Update category count
export function updateCategoryCount(id: string, count: number): Category[] {
  const categories = loadCategories();
  const updated = categories.map(c => 
    c.id === id ? { ...c, count } : c
  );
  saveCategories(updated);
  return updated;
}

// Get category names for product dropdown
export function getCategoryNames(): string[] {
  const categories = loadCategories();
  return categories.map(c => c.name);
}
