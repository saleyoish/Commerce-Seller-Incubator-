-- Create TikTok products table for syncing products from TikTok Shop

CREATE TABLE IF NOT EXISTS tiktok_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  tiktok_product_id TEXT,
  tiktok_sku TEXT,
  title TEXT,
  description TEXT,
  price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  quantity INTEGER DEFAULT 0,
  category_id TEXT,
  images TEXT[] DEFAULT '{}',
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed', 'syncing')),
  sync_error TEXT,
  last_sync_at TIMESTAMPTZ,
  tiktok_created_at TIMESTAMPTZ,
  tiktok_updated_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint on seller_id and product_id
  UNIQUE(seller_id, product_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tiktok_products_seller_id ON tiktok_products(seller_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_products_product_id ON tiktok_products(product_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_products_tiktok_product_id ON tiktok_products(tiktok_product_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_products_sync_status ON tiktok_products(sync_status);
CREATE INDEX IF NOT EXISTS idx_tiktok_products_last_sync_at ON tiktok_products(last_sync_at DESC);

-- Create tiktok_sync_logs table for tracking sync operations
CREATE TABLE IF NOT EXISTS tiktok_sync_logs (
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
CREATE INDEX IF NOT EXISTS idx_tiktok_sync_logs_seller_id ON tiktok_sync_logs(seller_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_sync_logs_status ON tiktok_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_tiktok_sync_logs_sync_type ON tiktok_sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_tiktok_sync_logs_started_at ON tiktok_sync_logs(started_at DESC);

-- Add updated_at trigger for tiktok_products
CREATE TRIGGER update_tiktok_products_updated_at
  BEFORE UPDATE ON tiktok_products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security policies
ALTER TABLE tiktok_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiktok_sync_logs ENABLE ROW LEVEL SECURITY;

-- tiktok_products RLS policies
CREATE POLICY "Sellers can view their own tiktok products" ON tiktok_products
  FOR SELECT USING (
    seller_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service can manage all tiktok products" ON tiktok_products
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- tiktok_sync_logs RLS policies
CREATE POLICY "Sellers can view their own sync logs" ON tiktok_sync_logs
  FOR SELECT USING (
    seller_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service can manage all sync logs" ON tiktok_sync_logs
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- Add comments for documentation
COMMENT ON TABLE tiktok_products IS 'Products synced from TikTok Shop platform';
COMMENT ON TABLE tiktok_sync_logs IS 'Logs for TikTok sync operations';
COMMENT ON COLUMN tiktok_products.sync_status IS 'Status of product sync: pending, synced, failed, syncing';
COMMENT ON COLUMN tiktok_products.metadata IS 'Additional metadata from TikTok API';
