-- ============================================
-- M2: TikTok Shop Fast Track - Database Schema
-- ============================================

-- Enable UUID extension (already exists from M1)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- WAITLIST TABLE
-- ============================================
CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  what_you_sell TEXT,
  has_live_experience BOOLEAN,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, contacted
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies for waitlist
-- Allow anyone to create waitlist entries (public access for landing page)
CREATE POLICY "public_create_waitlist" ON waitlist
  FOR INSERT WITH CHECK (true);

-- Allow anyone to view their own entry by email (for checking status)
CREATE POLICY "public_view_waitlist_own" ON waitlist
  FOR SELECT USING (true);

-- Allow admins full access
CREATE POLICY "admins_all_waitlist" ON waitlist
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
    )
  );

-- ============================================
-- APPLICATIONS TABLE
-- ============================================
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  waitlist_id UUID REFERENCES waitlist(id),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address JSONB, -- { street, city, state, zip, country }
  has_llc BOOLEAN,
  business_name TEXT,
  tax_id TEXT,
  product_categories TEXT[], -- ['Fashion', 'Beauty', 'Electronics', 'Home', 'Other']
  product_photos TEXT[], -- Array of Supabase Storage URLs
  inventory_value TEXT, -- 'under_5k', '5k_to_25k', '25k_to_100k', 'over_100k'
  price_range TEXT, -- 'under_25', '25_to_50', '50_to_100', 'over_100'
  tiktok_experience BOOLEAN,
  live_experience BOOLEAN,
  live_platforms TEXT[], -- ['TikTok', 'Instagram', 'YouTube', 'Whatnot', 'Other']
  tiktok_username TEXT,
  monthly_goal TEXT, -- 'under_1k', '1k_to_5k', '5k_to_10k', 'over_10k'
  equipment JSONB, -- { smartphone, ring_light, stable_internet, quiet_space }
  availability JSONB, -- { hours_per_week, preferred_times: ['morning', 'afternoon', 'evening', 'late_night'] }
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, interview
  reviewed_by UUID REFERENCES admins(id),
  reviewed_at TIMESTAMP,
  notes TEXT, -- Internal admin notes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for applications
-- Allow anyone to create applications (public access)
CREATE POLICY "public_create_applications" ON applications
  FOR INSERT WITH CHECK (true);

-- Allow users to view their own application
CREATE POLICY "public_view_applications_own" ON applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM waitlist WHERE waitlist.id = applications.waitlist_id 
      AND waitlist.email = auth.jwt() ->> 'email'
    )
  );

-- Allow admins full access
CREATE POLICY "admins_all_applications" ON applications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
    )
  );

-- ============================================
-- TRAINING PROGRESS TABLE
-- ============================================
CREATE TABLE training_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE NOT NULL,
  module_id TEXT NOT NULL, -- 'getting-started', 'tiktok-setup', 'obs-setup', etc.
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(seller_id, module_id)
);

-- Enable RLS
ALTER TABLE training_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for training_progress
-- Sellers can view their own progress
CREATE POLICY "sellers_own_training" ON training_progress
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sellers WHERE sellers.id = training_progress.seller_id 
      AND sellers.user_id = auth.uid()
    )
  );

-- Allow admins full access
CREATE POLICY "admins_all_training" ON training_progress
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
    )
  );

-- ============================================
-- REFERRALS TABLE
-- ============================================
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID REFERENCES sellers(id) NOT NULL,
  referred_id UUID REFERENCES sellers(id),
  referred_email TEXT NOT NULL, -- Store email in case seller record not yet created
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, approved, active, paid
  first_sale_date TIMESTAMP WITH TIME ZONE,
  bonus_amount DECIMAL(10,2) DEFAULT 50.00,
  paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referrals
-- Sellers can view their own referrals
CREATE POLICY "sellers_own_referrals" ON referrals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sellers WHERE sellers.id = referrals.referrer_id 
      AND sellers.user_id = auth.uid()
    )
  );

-- Sellers can create referrals (for tracking)
CREATE POLICY "sellers_create_referrals" ON referrals
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sellers WHERE sellers.id = referrals.referrer_id 
      AND sellers.user_id = auth.uid()
    )
  );

-- Allow admins full access
CREATE POLICY "admins_all_referrals" ON referrals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
    )
  );

-- ============================================
-- UPDATE SELLERS TABLE - ADD REFERRAL CODE
-- ============================================
-- Add referral_code column to sellers table
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Generate unique referral codes for existing sellers
UPDATE sellers 
SET referral_code = substring(md5(random()::text || id::text) from 1 for 8)
WHERE referral_code IS NULL;

-- Create function to generate unique referral codes
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  exists_count INTEGER;
BEGIN
  LOOP
    new_code := substring(md5(random()::text) from 1 for 8);
    SELECT COUNT(*) INTO exists_count FROM sellers WHERE referral_code = new_code;
    EXIT WHEN exists_count = 0;
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate referral code on seller creation
CREATE OR REPLACE FUNCTION set_referral_code_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to sellers table
DROP TRIGGER IF EXISTS set_referral_code_trigger ON sellers;
CREATE TRIGGER set_referral_code_trigger
  BEFORE INSERT ON sellers
  FOR EACH ROW
  EXECUTE FUNCTION set_referral_code_on_insert();

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Update updated_at trigger function (already exists from M1)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Add triggers for all new tables
CREATE TRIGGER update_waitlist_updated_at BEFORE UPDATE ON waitlist
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_progress_updated_at BEFORE UPDATE ON training_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_referrals_updated_at BEFORE UPDATE ON referrals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_waitlist_id ON applications(waitlist_id);
CREATE INDEX IF NOT EXISTS idx_applications_email ON applications(email);
CREATE INDEX IF NOT EXISTS idx_training_seller_id ON training_progress(seller_id);
CREATE INDEX IF NOT EXISTS idx_training_module_id ON training_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_sellers_referral_code ON sellers(referral_code);

-- ============================================
-- STORAGE BUCKET SETUP
-- ============================================
-- Note: Application document bucket should be created via Supabase Dashboard
-- Bucket name: application-documents
-- Settings:
--   - Public bucket: false (private)
--   - File size limit: 10485760 (10MB in bytes)
--   - Allowed MIME types: image/jpeg, image/png, image/webp, application/pdf

-- ============================================
-- VIEWS FOR ADMIN ANALYTICS
-- ============================================

-- View for training completion stats (admin only)
CREATE OR REPLACE VIEW training_completion_stats AS
SELECT 
  s.id as seller_id,
  s.email,
  COUNT(DISTINCT tp.module_id) as completed_modules,
  8 as total_modules,
  ROUND((COUNT(DISTINCT tp.module_id) / 8.0) * 100) as completion_percentage
FROM sellers s
LEFT JOIN training_progress tp ON s.id = tp.seller_id AND tp.completed = true
GROUP BY s.id, s.email;

-- Admin-only access policy for training_completion_stats
ALTER VIEW training_completion_stats SET (security_barrier = true);
CREATE POLICY "admin_only_training_completion_stats" ON training_completion_stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
    )
  );

-- View for referral stats (admin only)
CREATE OR REPLACE VIEW referral_stats AS
SELECT 
  s.id as referrer_id,
  s.email as referrer_email,
  COUNT(DISTINCT r.id) as total_referrals,
  COUNT(DISTINCT CASE WHEN r.status = 'approved' THEN r.id END) as approved_referrals,
  COUNT(DISTINCT CASE WHEN r.status = 'active' THEN r.id END) as active_referrals,
  COUNT(DISTINCT CASE WHEN r.paid = true THEN r.id END) as paid_referrals,
  COALESCE(SUM(CASE WHEN r.paid = true THEN r.bonus_amount ELSE 0 END), 0) as total_bonus_paid,
  COALESCE(SUM(CASE WHEN r.paid = false AND r.status = 'active' THEN r.bonus_amount ELSE 0 END), 0) as pending_bonus_amount
FROM sellers s
LEFT JOIN referrals r ON s.id = r.referrer_id
GROUP BY s.id, s.email;

-- Admin-only access policy for referral_stats
ALTER VIEW referral_stats SET (security_barrier = true);
CREATE POLICY "admin_only_referral_stats" ON referral_stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
    )
  );

-- ============================================
-- FUNCTIONS FOR ANALYTICS
-- ============================================

-- Function to get top referrers
CREATE OR REPLACE FUNCTION get_top_referrers(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  referrer_id UUID,
  referrer_email TEXT,
  referral_code TEXT,
  total_referrals BIGINT,
  active_referrals BIGINT,
  total_bonus_paid DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as referrer_id,
    s.email as referrer_email,
    s.referral_code,
    COUNT(r.id) as total_referrals,
    COUNT(CASE WHEN r.status = 'active' THEN 1 END) as active_referrals,
    COALESCE(SUM(CASE WHEN r.paid = true THEN r.bonus_amount ELSE 0 END), 0) as total_bonus_paid
  FROM sellers s
  LEFT JOIN referrals r ON s.id = r.referrer_id
  GROUP BY s.id, s.email, s.referral_code
  HAVING COUNT(r.id) > 0
  ORDER BY total_bonus_paid DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SEED DATA (Optional)
-- ============================================
-- Example: Create a test waitlist entry
-- INSERT INTO waitlist (name, email, phone, what_you_sell, has_live_experience)
-- VALUES ('Test User', 'test@example.com', '555-1234', 'Fashion accessories', false);


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

-- Add stream configuration fields to sellers table
ALTER TABLE sellers
ADD COLUMN IF NOT EXISTS stream_embed_url TEXT,
ADD COLUMN IF NOT EXISTS schedule_text TEXT DEFAULT 'Live shows: Check back for schedule';

-- Update existing rows to have a default schedule text
UPDATE sellers 
SET schedule_text = 'Live shows: Check back for schedule' 
WHERE schedule_text IS NULL;
