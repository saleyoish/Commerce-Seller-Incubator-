// Platform Configuration
// All business logic constants centralized here for easy modification

export const PLATFORM_CONFIG = {
  // Commission & Financial
  PLATFORM_FEE_PERCENT: 15,           // 15% commission on each sale
  MIN_PAYOUT_THRESHOLD: 100,          // $100 minimum before payout allowed
  CURRENCY: 'USD' as const,           // Default currency
  SUPPORTED_CURRENCIES: ['USD'] as const, // Extensible for future multi-currency support
  
  // File Upload Limits
  MAX_IMAGE_SIZE_MB: 5,               // 5MB per image
  MAX_IMAGES_PER_PRODUCT: 5,          // Max 5 images per product
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'] as const,
  
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  
  // Product Categories
  PRODUCT_CATEGORIES: [
    'Fashion',
    'Electronics', 
    'Beauty',
    'Home',
    'Other'
  ] as const,
  
  // Seller Status
  SELLER_STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
  } as const,
  
  // Stripe Onboarding Status
  STRIPE_STATUS: {
    PENDING: 'pending',
    ACTIVE: 'active',
    REJECTED: 'rejected',
  } as const,
  
  // Product Status
  PRODUCT_STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    DELETED: 'deleted',
  } as const,
  
  // Sale Status
  SALE_STATUS: {
    PENDING: 'pending',
    COMPLETED: 'completed',
    REFUNDED: 'refunded',
  } as const,
} as const;

// Type exports for TypeScript
export type ProductCategory = typeof PLATFORM_CONFIG.PRODUCT_CATEGORIES[number];
export type SellerStatus = typeof PLATFORM_CONFIG.SELLER_STATUS[keyof typeof PLATFORM_CONFIG.SELLER_STATUS];
export type StripeStatus = typeof PLATFORM_CONFIG.STRIPE_STATUS[keyof typeof PLATFORM_CONFIG.STRIPE_STATUS];
export type ProductStatus = typeof PLATFORM_CONFIG.PRODUCT_STATUS[keyof typeof PLATFORM_CONFIG.PRODUCT_STATUS];
export type SaleStatus = typeof PLATFORM_CONFIG.SALE_STATUS[keyof typeof PLATFORM_CONFIG.SALE_STATUS];
