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

-- View for training completion stats
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

-- View for referral stats
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

