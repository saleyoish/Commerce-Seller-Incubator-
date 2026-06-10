-- Add metadata column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN products.metadata IS 'Additional metadata for products, including platform-specific data like Meta product IDs';
