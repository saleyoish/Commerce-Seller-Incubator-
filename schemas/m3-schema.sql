-- ============================================
-- M3: Multi-Stream Expansion + Commission Tracker - Database Schema
-- ============================================

-- Enable UUID extension (already exists from M1/M2)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PLATFORM CONNECTIONS TABLE
-- ============================================
CREATE TABLE platform_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL, -- 'tiktok', 'whatnot', 'youtube', 'facebook', 'instagram'
  status TEXT DEFAULT 'pending', -- pending, connected, disconnected, failed
  platform_username TEXT,
  platform_user_id TEXT,
  platform_category TEXT,
  platform_bio TEXT,
  access_token TEXT, -- for API integrations (encrypted)
  refresh_token TEXT, -- for API integrations (encrypted)
  token_expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}', -- platform-specific data
  connected_at TIMESTAMP WITH TIME ZONE,
  disconnected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE platform_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for platform_connections
-- Sellers can view/manage their own connections
CREATE POLICY "sellers_own_platform_connections" ON platform_connections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sellers WHERE sellers.id = platform_connections.seller_id 
      AND sellers.user_id = auth.uid()
    )
  );

-- Allow admins full access
CREATE POLICY "admins_all_platform_connections" ON platform_connections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
    )
  );

-- ============================================
-- PLATFORM SALES TABLE (Multi-platform sales tracking)
-- ============================================
CREATE TABLE platform_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL, -- 'tiktok', 'whatnot', 'youtube', 'facebook', 'instagram', 'platform_site'
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT,
  sale_amount DECIMAL(10,2) NOT NULL CHECK (sale_amount >= 0),
  platform_fee DECIMAL(10,2) DEFAULT 0, -- Platform's cut (Whatnot 8%, etc.)
  our_commission DECIMAL(10,2) NOT NULL, -- Our 15%
  seller_payout DECIMAL(10,2) NOT NULL, -- What seller receives
  external_sale_id TEXT, -- Sale ID from external platform
  buyer_info JSONB DEFAULT '{}', -- { name, email, phone }
  sale_date TIMESTAMP WITH TIME ZONE NOT NULL,
  payout_status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  
  -- Manual entry fields
  entry_type TEXT DEFAULT 'automatic', -- automatic, manual
  verification_status TEXT DEFAULT 'verified', -- verified, pending, rejected
  verified_by UUID REFERENCES admins(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  receipt_url TEXT,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE platform_sales ENABLE ROW LEVEL SECURITY;

-- RLS Policies for platform_sales
-- Sellers can view their own sales
CREATE POLICY "sellers_own_platform_sales" ON platform_sales
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sellers WHERE sellers.id = platform_sales.seller_id 
      AND sellers.user_id = auth.uid()
    )
  );

-- Sellers can create manual sales (insert only, no update/delete)
CREATE POLICY "sellers_create_manual_sales" ON platform_sales
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sellers WHERE sellers.id = platform_sales.seller_id 
      AND sellers.user_id = auth.uid()
    )
    AND entry_type = 'manual'
  );

-- Allow admins full access
CREATE POLICY "admins_all_platform_sales" ON platform_sales
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
    )
  );

-- ============================================
-- STREAM SESSIONS TABLE (Show scheduling + live tracking)
-- ============================================
CREATE TABLE stream_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_start TIMESTAMP WITH TIME ZONE,
  actual_start TIMESTAMP WITH TIME ZONE,
  actual_end TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'scheduled', -- scheduled, live, ended, cancelled
  platforms TEXT[] DEFAULT '{}', -- ['tiktok', 'whatnot', 'youtube']
  restream_event_id TEXT,
  products_featured UUID[] DEFAULT '{}', -- array of product IDs
  thumbnail_url TEXT,
  
  -- Aggregated metrics
  total_viewers INTEGER DEFAULT 0,
  peak_viewers INTEGER DEFAULT 0,
  total_sales DECIMAL(10,2) DEFAULT 0,
  
  -- Reminder tracking
  reminder_sent_24h BOOLEAN DEFAULT FALSE,
  reminder_sent_1h BOOLEAN DEFAULT FALSE,
  
  metadata JSONB DEFAULT '{}', -- platform-specific metrics
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE stream_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stream_sessions
-- Sellers can view/manage their own sessions
CREATE POLICY "sellers_own_stream_sessions" ON stream_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sellers WHERE sellers.id = stream_sessions.seller_id 
      AND sellers.user_id = auth.uid()
    )
  );

-- Allow admins full access
CREATE POLICY "admins_all_stream_sessions" ON stream_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
    )
  );

-- ============================================
-- STREAM PLATFORM METRICS TABLE (Per-platform analytics during stream)
-- ============================================
CREATE TABLE stream_platform_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stream_session_id UUID REFERENCES stream_sessions(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL, -- 'tiktok', 'whatnot', 'youtube', etc.
  viewers_current INTEGER DEFAULT 0,
  viewers_peak INTEGER DEFAULT 0,
  chat_messages INTEGER DEFAULT 0,
  sales_count INTEGER DEFAULT 0,
  sales_total DECIMAL(10,2) DEFAULT 0,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE stream_platform_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stream_platform_metrics
-- Sellers can view metrics for their own streams
CREATE POLICY "sellers_own_stream_metrics" ON stream_platform_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stream_sessions 
      WHERE stream_sessions.id = stream_platform_metrics.stream_session_id
      AND EXISTS (
        SELECT 1 FROM sellers WHERE sellers.id = stream_sessions.seller_id 
        AND sellers.user_id = auth.uid()
      )
    )
  );

-- Allow admins full access
CREATE POLICY "admins_all_stream_metrics" ON stream_platform_metrics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
    )
  );

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Update updated_at trigger function (already exists from M1, but included for reference)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Add triggers for all new tables
CREATE TRIGGER update_platform_connections_updated_at BEFORE UPDATE ON platform_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_sales_updated_at BEFORE UPDATE ON platform_sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stream_sessions_updated_at BEFORE UPDATE ON stream_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_platform_connections_seller ON platform_connections(seller_id);
CREATE INDEX idx_platform_connections_platform ON platform_connections(platform);
CREATE INDEX idx_platform_connections_status ON platform_connections(status);

CREATE INDEX idx_platform_sales_seller ON platform_sales(seller_id);
CREATE INDEX idx_platform_sales_platform ON platform_sales(platform);
CREATE INDEX idx_platform_sales_date ON platform_sales(sale_date);
CREATE INDEX idx_platform_sales_payout_status ON platform_sales(payout_status);
CREATE INDEX idx_platform_sales_verification ON platform_sales(verification_status);
CREATE INDEX idx_platform_sales_entry_type ON platform_sales(entry_type);

CREATE INDEX idx_stream_sessions_seller ON stream_sessions(seller_id);
CREATE INDEX idx_stream_sessions_status ON stream_sessions(status);
CREATE INDEX idx_stream_sessions_scheduled ON stream_sessions(scheduled_start);
CREATE INDEX idx_stream_sessions_platforms ON stream_sessions USING GIN(platforms);

CREATE INDEX idx_stream_metrics_session ON stream_platform_metrics(stream_session_id);
CREATE INDEX idx_stream_metrics_platform ON stream_platform_metrics(platform);
CREATE INDEX idx_stream_metrics_recorded ON stream_platform_metrics(recorded_at);

-- ============================================
-- MATERIALIZED VIEW FOR SELLER RANKINGS (Leaderboard)
-- ============================================
CREATE MATERIALIZED VIEW seller_rankings AS
SELECT 
  s.id AS seller_id,
  s.email,
  s.email AS seller_name,
  COUNT(DISTINCT ss.id) AS total_shows,
  COALESCE(SUM(ps.sale_amount), 0) AS total_sales,
  COALESCE(SUM(ps.our_commission), 0) AS total_commission,
  COALESCE(AVG(ps.sale_amount), 0) AS avg_sale_amount,
  MAX(ps.sale_date) AS last_sale_date,
  -- Calculate rank based on total sales
  ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(ps.sale_amount), 0) DESC) AS rank
FROM sellers s
LEFT JOIN stream_sessions ss ON s.id = ss.seller_id AND ss.status = 'ended'
LEFT JOIN platform_sales ps ON s.id = ps.seller_id AND ps.verification_status = 'verified'
GROUP BY s.id, s.email
ORDER BY total_sales DESC;

-- Admin-only access policy for seller_rankings
ALTER MATERIALIZED VIEW seller_rankings SET (security_barrier = true);
CREATE POLICY "admin_only_seller_rankings" ON seller_rankings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
    )
  );

-- Create index for fast leaderboard queries
CREATE UNIQUE INDEX idx_seller_rankings_seller_id ON seller_rankings(seller_id);
CREATE INDEX idx_seller_rankings_total_sales ON seller_rankings(total_sales DESC);
CREATE INDEX idx_seller_rankings_rank ON seller_rankings(rank);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_seller_rankings()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY seller_rankings;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMISSION CALCULATION FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION calculate_commission(
  sale_amount DECIMAL(10,2),
  platform_name TEXT,
  platform_fee_amount DECIMAL(10,2) DEFAULT NULL
)
RETURNS TABLE (
  platform_fee DECIMAL(10,2),
  our_commission DECIMAL(10,2),
  seller_payout DECIMAL(10,2)
) AS $$
DECLARE
  calculated_platform_fee DECIMAL(10,2);
  subtotal DECIMAL(10,2);
  our_cut DECIMAL(10,2);
  seller_amount DECIMAL(10,2);
BEGIN
  -- Default platform fees if not provided
  IF platform_fee_amount IS NULL THEN
    calculated_platform_fee := CASE platform_name
      WHEN 'whatnot' THEN sale_amount * 0.08
      WHEN 'tiktok' THEN sale_amount * 0.02  -- TikTok Shop ~2% + processing
      WHEN 'youtube' THEN sale_amount * 0.30  -- YouTube takes 30%
      WHEN 'facebook' THEN sale_amount * 0.05 -- Facebook ~5%
      WHEN 'instagram' THEN sale_amount * 0.05 -- Instagram ~5%
      ELSE sale_amount * 0.05
    END;
  ELSE
    calculated_platform_fee := platform_fee_amount;
  END IF;
  
  -- Calculate subtotal after platform fee
  subtotal := sale_amount - calculated_platform_fee;
  
  -- Our commission is 15% of the subtotal
  our_cut := subtotal * 0.15;
  
  -- Seller gets the rest
  seller_amount := subtotal - our_cut;
  
  RETURN QUERY SELECT calculated_platform_fee, our_cut, seller_amount;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEWS FOR ADMIN ANALYTICS
-- ============================================

-- View for platform performance summary (admin only)
CREATE OR REPLACE VIEW platform_performance_summary AS
SELECT 
  platform,
  COUNT(*) AS total_sales,
  SUM(sale_amount) AS total_revenue,
  SUM(platform_fee) AS total_platform_fees,
  SUM(our_commission) AS total_our_commission,
  SUM(seller_payout) AS total_seller_payouts,
  AVG(sale_amount) AS avg_sale_amount,
  COUNT(DISTINCT seller_id) AS unique_sellers
FROM platform_sales
WHERE verification_status = 'verified'
GROUP BY platform;

-- Admin-only access policy for platform_performance_summary
ALTER VIEW platform_performance_summary SET (security_barrier = true);
CREATE POLICY "admin_only_platform_performance_summary" ON platform_performance_summary
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
    )
  );

-- View for pending manual sales (admin review queue)
CREATE OR REPLACE VIEW pending_manual_sales AS
SELECT 
  ps.*,
  s.email AS seller_email,
  s.phone AS seller_phone
FROM platform_sales ps
JOIN sellers s ON ps.seller_id = s.id
WHERE ps.entry_type = 'manual'
  AND ps.verification_status = 'pending'
ORDER BY ps.created_at ASC;

-- Admin-only access policy for pending_manual_sales
ALTER VIEW pending_manual_sales SET (security_barrier = true);
CREATE POLICY "admin_only_pending_manual_sales" ON pending_manual_sales
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
    )
  );

-- View for upcoming scheduled streams (admin only)
CREATE OR REPLACE VIEW upcoming_streams AS
SELECT 
  ss.*,
  s.email AS seller_email,
  array_length(ss.platforms, 1) AS platform_count
FROM stream_sessions ss
JOIN sellers s ON ss.seller_id = s.id
WHERE ss.status = 'scheduled'
  AND ss.scheduled_start > NOW()
ORDER BY ss.scheduled_start ASC;

-- Admin-only access policy for upcoming_streams
ALTER VIEW upcoming_streams SET (security_barrier = true);
CREATE POLICY "admin_only_upcoming_streams" ON upcoming_streams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
    )
  );

-- ============================================
-- STORAGE BUCKET SETUP (run in Supabase Dashboard)
-- ============================================
-- Note: Storage buckets must be created via Supabase Dashboard or Management API
-- Bucket name: sale-receipts
-- Settings:
--   - Public bucket: false (private)
--   - File size limit: 5242880 (5MB in bytes)
--   - Allowed MIME types: image/jpeg, image/png, image/webp, application/pdf
--   - Folder structure: {seller_id}/{sale_id}/
