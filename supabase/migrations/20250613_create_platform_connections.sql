-- Create unified platform_connections table for managing all marketplace connections
-- This replaces the need for separate connection tables per platform

CREATE TABLE IF NOT EXISTS platform_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'whatnot', 'meta', 'facebook', 'instagram', 'youtube')),
  status TEXT DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error', 'expired')),
  
  -- OAuth tokens
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  
  -- Platform-specific identifiers
  platform_user_id TEXT,
  platform_username TEXT,
  platform_email TEXT,
  
  -- Platform-specific metadata (JSONB for flexibility)
  metadata JSONB DEFAULT '{}',
  
  -- Sync tracking
  last_product_sync_at TIMESTAMPTZ,
  last_inventory_sync_at TIMESTAMPTZ,
  sync_enabled BOOLEAN DEFAULT true,
  
  -- Connection tracking
  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  disconnected_reason TEXT,
  
  -- Error tracking
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one connection per seller per platform
  UNIQUE(seller_id, platform)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_platform_connections_seller_id ON platform_connections(seller_id);
CREATE INDEX IF NOT EXISTS idx_platform_connections_platform ON platform_connections(platform);
CREATE INDEX IF NOT EXISTS idx_platform_connections_status ON platform_connections(status);
CREATE INDEX IF NOT EXISTS idx_platform_connections_platform_user_id ON platform_connections(platform_user_id);

-- Add updated_at trigger
CREATE TRIGGER update_platform_connections_updated_at
  BEFORE UPDATE ON platform_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE platform_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Sellers can view their own connections" ON platform_connections
  FOR SELECT USING (
    seller_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Sellers can insert their own connections" ON platform_connections
  FOR INSERT WITH CHECK (
    seller_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Sellers can update their own connections" ON platform_connections
  FOR UPDATE USING (
    seller_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all connections" ON platform_connections
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- Add comments
COMMENT ON TABLE platform_connections IS 'Unified table for managing marketplace platform connections';
COMMENT ON COLUMN platform_connections.platform IS 'Platform name: tiktok, whatnot, meta, facebook, instagram, youtube';
COMMENT ON COLUMN platform_connections.status IS 'Connection status: connected, disconnected, error, expired';
COMMENT ON COLUMN platform_connections.metadata IS 'Platform-specific metadata stored as JSONB';
COMMENT ON COLUMN platform_connections.sync_enabled IS 'Whether automatic sync is enabled for this connection';
