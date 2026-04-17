-- ============================================
-- TikTok Shop API Integration Schema
-- ============================================

-- ============================================
-- TIKTOK SHOP CONNECTIONS TABLE
-- Stores OAuth tokens and shop info for each seller
-- ============================================
CREATE TABLE IF NOT EXISTS tiktok_shop_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE NOT NULL,
  
  -- TikTok Shop Info
  tiktok_shop_id TEXT,
  shop_name TEXT,
  shop_region TEXT, -- US, UK, etc.
  shop_status TEXT DEFAULT 'inactive', -- active, inactive, suspended
  
  -- OAuth Tokens
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- TikTok API Scopes/Permissions
  scopes TEXT[], -- ['product', 'order', 'fulfillment', 'finance']
  
  -- Connection Status
  is_connected BOOLEAN DEFAULT FALSE,
  connected_at TIMESTAMP WITH TIME ZONE,
  disconnected_at TIMESTAMP WITH TIME ZONE,
  disconnected_reason TEXT,
  
  -- Last Sync Times
  last_product_sync_at TIMESTAMP WITH TIME ZONE,
  last_order_sync_at TIMESTAMP WITH TIME ZONE,
  last_inventory_sync_at TIMESTAMP WITH TIME ZONE,
  
  -- Webhook Config
  webhook_secret TEXT,
  webhook_endpoint_url TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE tiktok_shop_connections ENABLE ROW LEVEL SECURITY;

-- Sellers can only see their own connection
CREATE POLICY "sellers_own_tiktok_connection" ON tiktok_shop_connections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sellers WHERE sellers.id = tiktok_shop_connections.seller_id 
      AND sellers.user_id = auth.uid()
    )
  );

-- Admins can see all
CREATE POLICY "admins_all_tiktok_connections" ON tiktok_shop_connections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
    )
  );

-- ============================================
-- TIKTOK PRODUCTS TABLE
-- Maps our products to TikTok Shop products
-- ============================================
CREATE TABLE IF NOT EXISTS tiktok_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  
  -- TikTok Product IDs
  tiktok_product_id TEXT, -- TikTok's internal product ID
  sku TEXT,
  
  -- Sync Status
  sync_status TEXT DEFAULT 'pending', -- pending, synced, failed, out_of_sync
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_error TEXT,
  
  -- TikTok-specific Data
  tiktok_category_id TEXT,
  tiktok_brand_id TEXT,
  tiktok_attributes JSONB, -- Platform-specific attributes
  
  -- Listing Status on TikTok
  tiktok_status TEXT, -- active, inactive, draft, deleted, violation
  tiktok_listing_url TEXT,
  
  -- Sales Data from TikTok
  tiktok_sales_count INTEGER DEFAULT 0,
  tiktok_reviews_count INTEGER DEFAULT 0,
  tiktok_rating DECIMAL(2,1),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE tiktok_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sellers_own_tiktok_products" ON tiktok_products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sellers WHERE sellers.id = tiktok_products.seller_id 
      AND sellers.user_id = auth.uid()
    )
  );

CREATE POLICY "admins_all_tiktok_products" ON tiktok_products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
    )
  );

-- ============================================
-- TIKTOK ORDERS TABLE
-- Orders from TikTok Shop
-- ============================================
CREATE TABLE IF NOT EXISTS tiktok_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE NOT NULL,
  
  -- TikTok Order Info
  tiktok_order_id TEXT NOT NULL UNIQUE,
  order_status TEXT, -- unpaid, awaiting_shipment, partially_shipped, shipped, completed, cancelled
  
  -- Order Details
  buyer_info JSONB, -- { name, email, phone, address }
  items JSONB[], -- Array of order items with tiktok_product_ids
  
  -- Financials
  subtotal DECIMAL(10,2),
  shipping_cost DECIMAL(10,2),
  tax_amount DECIMAL(10,2),
  discount_amount DECIMAL(10,2),
  total_amount DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  
  -- Commission/Split
  platform_fee DECIMAL(10,2), -- TikTok's cut
  seller_earnings DECIMAL(10,2), -- Seller's 80% after fees
  
  -- Shipping
  shipping_provider TEXT,
  tracking_number TEXT,
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancel_reason TEXT,
  
  -- Flags
  is_flagged BOOLEAN DEFAULT FALSE,
  flag_reason TEXT,
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE tiktok_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sellers_own_tiktok_orders" ON tiktok_orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sellers WHERE sellers.id = tiktok_orders.seller_id 
      AND sellers.user_id = auth.uid()
    )
  );

CREATE POLICY "admins_all_tiktok_orders" ON tiktok_orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
    )
  );

-- ============================================
-- TIKTOK WEBHOOK EVENTS TABLE
-- Log of all webhook events from TikTok
-- ============================================
CREATE TABLE IF NOT EXISTS tiktok_webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Event Info
  event_type TEXT NOT NULL, -- PRODUCT_UPDATE, ORDER_STATUS_CHANGE, INVENTORY_CHANGE, etc.
  tiktok_shop_id TEXT,
  tiktok_order_id TEXT,
  tiktok_product_id TEXT,
  
  -- Payload
  payload JSONB,
  
  -- Processing Status
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP WITH TIME ZONE,
  processing_error TEXT,
  
  -- Signature verification
  signature TEXT,
  signature_valid BOOLEAN,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE tiktok_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_all_webhook_events" ON tiktok_webhook_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
    )
  );

-- ============================================
-- TIKTOK SYNC LOGS TABLE
-- Track all sync operations
-- ============================================
CREATE TABLE IF NOT EXISTS tiktok_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
  
  sync_type TEXT NOT NULL, -- product_push, product_pull, order_pull, inventory_sync
  status TEXT NOT NULL, -- started, completed, failed
  
  -- Stats
  items_total INTEGER,
  items_success INTEGER,
  items_failed INTEGER,
  
  -- Details
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  details JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE tiktok_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sellers_own_sync_logs" ON tiktok_sync_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sellers WHERE sellers.id = tiktok_sync_logs.seller_id 
      AND sellers.user_id = auth.uid()
    )
  );

CREATE POLICY "admins_all_sync_logs" ON tiktok_sync_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
    )
  );

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tiktok_connections_seller ON tiktok_shop_connections(seller_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_connections_shop_id ON tiktok_shop_connections(tiktok_shop_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_connections_status ON tiktok_shop_connections(is_connected);

CREATE INDEX IF NOT EXISTS idx_tiktok_products_seller ON tiktok_products(seller_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_products_product ON tiktok_products(product_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_products_tiktok_id ON tiktok_products(tiktok_product_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_products_status ON tiktok_products(sync_status);

CREATE INDEX IF NOT EXISTS idx_tiktok_orders_seller ON tiktok_orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_orders_tiktok_id ON tiktok_orders(tiktok_order_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_orders_status ON tiktok_orders(order_status);
CREATE INDEX IF NOT EXISTS idx_tiktok_orders_created ON tiktok_orders(created_at);

CREATE INDEX IF NOT EXISTS idx_tiktok_webhooks_type ON tiktok_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_tiktok_webhooks_processed ON tiktok_webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_tiktok_webhooks_created ON tiktok_webhook_events(created_at);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER update_tiktok_connections_updated_at BEFORE UPDATE ON tiktok_shop_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tiktok_products_updated_at BEFORE UPDATE ON tiktok_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tiktok_orders_updated_at BEFORE UPDATE ON tiktok_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
