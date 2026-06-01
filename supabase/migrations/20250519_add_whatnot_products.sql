-- Add Whatnot products table for syncing products from Whatnot

CREATE TABLE IF NOT EXISTS whatnot_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  whatnot_product_id TEXT,
  whatnot_sku TEXT,
  title TEXT,
  description TEXT,
  price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  quantity INTEGER DEFAULT 0,
  category TEXT,
  images TEXT[] DEFAULT '{}',
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed', 'syncing')),
  sync_error TEXT,
  last_sync_at TIMESTAMPTZ,
  whatnot_created_at TIMESTAMPTZ,
  whatnot_updated_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint on seller_id and product_id
  UNIQUE(seller_id, product_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatnot_products_seller_id ON whatnot_products(seller_id);
CREATE INDEX IF NOT EXISTS idx_whatnot_products_product_id ON whatnot_products(product_id);
CREATE INDEX IF NOT EXISTS idx_whatnot_products_whatnot_product_id ON whatnot_products(whatnot_product_id);
CREATE INDEX IF NOT EXISTS idx_whatnot_products_sync_status ON whatnot_products(sync_status);
CREATE INDEX IF NOT EXISTS idx_whatnot_products_last_sync_at ON whatnot_products(last_sync_at DESC);

-- Create whatnot_sync_logs table for tracking sync operations
CREATE TABLE IF NOT EXISTS whatnot_sync_logs (
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
CREATE INDEX IF NOT EXISTS idx_whatnot_sync_logs_seller_id ON whatnot_sync_logs(seller_id);
CREATE INDEX IF NOT EXISTS idx_whatnot_sync_logs_status ON whatnot_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_whatnot_sync_logs_sync_type ON whatnot_sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_whatnot_sync_logs_started_at ON whatnot_sync_logs(started_at DESC);

-- Update platform_connections table to add Whatnot-specific fields
ALTER TABLE platform_connections 
ADD COLUMN IF NOT EXISTS last_product_sync_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_inventory_sync_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sync_enabled BOOLEAN DEFAULT true;

-- Add updated_at trigger for whatnot_products
CREATE TRIGGER update_whatnot_products_updated_at
  BEFORE UPDATE ON whatnot_products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security policies
ALTER TABLE whatnot_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatnot_sync_logs ENABLE ROW LEVEL SECURITY;

-- whatnot_products RLS policies
CREATE POLICY "Sellers can view their own whatnot products" ON whatnot_products
  FOR SELECT USING (
    seller_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service can manage all whatnot products" ON whatnot_products
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- whatnot_sync_logs RLS policies
CREATE POLICY "Sellers can view their own sync logs" ON whatnot_sync_logs
  FOR SELECT USING (
    seller_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service can manage all sync logs" ON whatnot_sync_logs
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- Add comments for documentation
COMMENT ON TABLE whatnot_products IS 'Products synced from Whatnot platform';
COMMENT ON TABLE whatnot_sync_logs IS 'Logs for Whatnot sync operations';
COMMENT ON COLUMN whatnot_products.sync_status IS 'Status of product sync: pending, synced, failed, syncing';
COMMENT ON COLUMN whatnot_products.metadata IS 'Additional metadata from Whatnot API';
COMMENT ON COLUMN platform_connections.last_product_sync_at IS 'Timestamp of last product sync with Whatnot';
COMMENT ON COLUMN platform_connections.last_inventory_sync_at IS 'Timestamp of last inventory sync with Whatnot';
