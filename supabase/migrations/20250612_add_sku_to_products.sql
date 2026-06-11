-- Add SKU field to products table for duplicate prevention and inventory tracking

-- Add sku column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS sku TEXT;

-- Add unique constraint on seller_id and sku to prevent duplicates within a seller's catalog
-- This ensures each seller has unique SKUs
ALTER TABLE products 
ADD CONSTRAINT products_seller_sku_unique UNIQUE (seller_id, sku);

-- Add index for performance on SKU lookups
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- Add comment for documentation
COMMENT ON COLUMN products.sku IS 'Stock Keeping Unit - unique identifier for product within seller catalog';
