-- ============================================
-- Live Commerce Platform - Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ADMINS TABLE (MUST BE FIRST - other tables reference it)
-- ============================================
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admins
-- Users can only see their own admin row (if they're an admin)
CREATE POLICY "admins_view_own" ON admins
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- SELLERS TABLE
-- ============================================
CREATE TABLE sellers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  stripe_account_id TEXT,
  stripe_onboarding_status TEXT DEFAULT 'pending', -- pending, active, rejected
  approval_status TEXT DEFAULT 'pending', -- pending, approved, rejected
  stream_embed_url TEXT, -- Restream embed URL or TikTok live link
  schedule_text TEXT DEFAULT 'Live shows: Check back for schedule', -- Simple schedule description
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sellers
CREATE POLICY "sellers_own_data" ON sellers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "sellers_insert_own" ON sellers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sellers_update_own" ON sellers
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow admins full access
CREATE POLICY "admins_all_access" ON sellers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
    )
  );

-- ============================================
-- PRODUCTS TABLE
-- ============================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  category TEXT NOT NULL, -- Fashion, Electronics, Beauty, Home, Other
  stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
  images TEXT[], -- Array of Supabase Storage URLs
  status TEXT DEFAULT 'active', -- active, inactive, deleted
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for products
CREATE POLICY "sellers_own_products" ON products
  FOR ALL USING (
    seller_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()
    )
  );

-- Public can view active products (for live show page)
CREATE POLICY "public_view_active_products" ON products
  FOR SELECT USING (status = 'active');

-- Admin full access
CREATE POLICY "admins_all_products" ON products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
    )
  );

-- ============================================
-- SALES TABLE
-- ============================================
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  status TEXT DEFAULT 'pending', -- pending, completed, refunded
  quantity INTEGER DEFAULT 1,
  buyer_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sales
CREATE POLICY "sellers_own_sales" ON sales
  FOR SELECT USING (
    seller_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()
    )
  );

-- Admin full access
CREATE POLICY "admins_all_sales" ON sales
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
    )
  );

-- ============================================
-- STORAGE BUCKET SETUP (run in Supabase Dashboard SQL Editor or via API)
-- ============================================
-- Note: Storage buckets must be created via Supabase Dashboard or Management API
-- Bucket name: product-images
-- Settings:
--   - Public bucket: true
--   - File size limit: 5242880 (5MB in bytes)
--   - Allowed MIME types: image/jpeg, image/png, image/webp

-- Storage RLS policies (add after creating bucket):
-- CREATE POLICY "Authenticated users can upload images" ON storage.objects
--   FOR INSERT WITH CHECK (
--     bucket_id = 'product-images' AND auth.role() = 'authenticated'
--   );

-- CREATE POLICY "Anyone can view product images" ON storage.objects
--   FOR SELECT USING (bucket_id = 'product-images');

-- CREATE POLICY "Sellers can delete their own images" ON storage.objects
--   FOR DELETE USING (
--     bucket_id = 'product-images' AND 
--     auth.uid() = owner
--   );

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_sellers_user_id ON sellers(user_id);
CREATE INDEX idx_sellers_stripe_account ON sellers(stripe_account_id);
CREATE INDEX idx_sellers_approval_status ON sellers(approval_status);
CREATE INDEX idx_products_seller_id ON products(seller_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_sales_seller_id ON sales(seller_id);
CREATE INDEX idx_sales_product_id ON sales(product_id);
CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_sales_created_at ON sales(created_at);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_sellers_updated_at BEFORE UPDATE ON sellers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admins WHERE user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SEED DATA (Optional - for initial admin setup)
-- ============================================
  -- Insert initial admin after signup:
  -- INSERT INTO admins (user_id, email) VALUES ('auth-user-uuid-here', 'admin@example.com');
