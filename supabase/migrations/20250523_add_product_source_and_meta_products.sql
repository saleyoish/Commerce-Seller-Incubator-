-- Add product source tracking and Meta Commerce products table

-- Add source_platform field to products table to track which platform the product came from
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS source_platform TEXT DEFAULT 'manual' CHECK (source_platform IN ('manual', 'meta', 'tiktok', 'whatnot', 'youtube', 'facebook', 'instagram'));

-- Add variants field to products table (JSONB to store variant information)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]';

-- Add availability field to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS availability TEXT DEFAULT 'in_stock' CHECK (availability IN ('in_stock', 'out_of_stock', 'preorder', 'discontinued'));

-- Add data_sources field to products table (JSONB to track which platforms have this product)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS data_sources JSONB DEFAULT '{}';

-- Add sale_price field to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10,2) CHECK (sale_price >= 0);

-- Add comments for documentation
COMMENT ON COLUMN products.source_platform IS 'Platform where product originated: manual, meta, tiktok, whatnot, youtube, facebook, instagram';
COMMENT ON COLUMN products.variants IS 'Product variants stored as JSONB array';
COMMENT ON COLUMN products.availability IS 'Product availability status: in_stock, out_of_stock, preorder, discontinued';
COMMENT ON COLUMN products.data_sources IS 'JSONB object tracking which platforms have this product synced';
COMMENT ON COLUMN products.sale_price IS 'Sale/discounted price for the product';

-- Create meta_products table for Meta/Facebook Commerce product sync
CREATE TABLE IF NOT EXISTS meta_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  meta_product_id TEXT,
  meta_catalog_id TEXT,
  meta_sku TEXT,
  title TEXT,
  description TEXT,
  price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  availability TEXT,
  retailer_id TEXT,
  retailer_price DECIMAL(10,2),
  images TEXT[] DEFAULT '{}',
  variants JSONB DEFAULT '[]',
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed', 'syncing')),
  sync_error TEXT,
  last_sync_at TIMESTAMPTZ,
  meta_created_at TIMESTAMPTZ,
  meta_updated_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint on seller_id and product_id
  UNIQUE(seller_id, product_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_meta_products_seller_id ON meta_products(seller_id);
CREATE INDEX IF NOT EXISTS idx_meta_products_product_id ON meta_products(product_id);
CREATE INDEX IF NOT EXISTS idx_meta_products_meta_product_id ON meta_products(meta_product_id);
CREATE INDEX IF NOT EXISTS idx_meta_products_meta_catalog_id ON meta_products(meta_catalog_id);
CREATE INDEX IF NOT EXISTS idx_meta_products_sync_status ON meta_products(sync_status);
CREATE INDEX IF NOT EXISTS idx_meta_products_last_sync_at ON meta_products(last_sync_at DESC);

-- Create meta_sync_logs table for tracking sync operations
CREATE TABLE IF NOT EXISTS meta_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('product_pull', 'product_push', 'inventory_sync')),
  status TEXT DEFAULT 'started' CHECK (status IN ('started', 'completed', 'failed', 'cancelled')),
  items_total INTEGER DEFAULT 0,
  items_success INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

-- Create indexes for sync logs
CREATE INDEX IF NOT EXISTS idx_meta_sync_logs_seller_id ON meta_sync_logs(seller_id);
CREATE INDEX IF NOT EXISTS idx_meta_sync_logs_status ON meta_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_meta_sync_logs_sync_type ON meta_sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_meta_sync_logs_started_at ON meta_sync_logs(started_at DESC);

-- Update platform_connections table to add Meta-specific fields
ALTER TABLE platform_connections 
ADD COLUMN IF NOT EXISTS last_product_sync_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_inventory_sync_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sync_enabled BOOLEAN DEFAULT true;

-- Add updated_at trigger for meta_products
CREATE TRIGGER update_meta_products_updated_at
  BEFORE UPDATE ON meta_products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security policies
ALTER TABLE meta_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_sync_logs ENABLE ROW LEVEL SECURITY;

-- meta_products RLS policies
CREATE POLICY "Sellers can view their own meta products" ON meta_products
  FOR SELECT USING (
    seller_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service can manage all meta products" ON meta_products
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- meta_sync_logs RLS policies
CREATE POLICY "Sellers can view their own sync logs" ON meta_sync_logs
  FOR SELECT USING (
    seller_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service can manage all sync logs" ON meta_sync_logs
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- Add comments for documentation
COMMENT ON TABLE meta_products IS 'Products synced from Meta/Facebook Commerce platform';
COMMENT ON TABLE meta_sync_logs IS 'Logs for Meta sync operations';
COMMENT ON COLUMN meta_products.sync_status IS 'Status of product sync: pending, synced, failed, syncing';
COMMENT ON COLUMN meta_products.metadata IS 'Additional metadata from Meta API';
COMMENT ON COLUMN platform_connections.last_product_sync_at IS 'Timestamp of last product sync with Meta';
COMMENT ON COLUMN platform_connections.last_inventory_sync_at IS 'Timestamp of last inventory sync with Meta';
