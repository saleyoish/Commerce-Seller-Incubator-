-- Production-ready streaming schema for TikTok Shop Fast Track
-- Migration: Create improved streaming tables with proper indexes and constraints

-- Create stream_status enum type
CREATE TYPE stream_status AS ENUM (
  'pending',
  'live', 
  'ended',
  'error',
  'cancelled'
);

-- Create stream_type enum type
CREATE TYPE stream_type AS ENUM (
  'instant',
  'scheduled',
  'automated'
);

-- Create webhook_event_type enum type
CREATE TYPE webhook_event_type AS ENUM (
  'stream.started',
  'stream.ended', 
  'stream.created',
  'stream.updated',
  'stream.error'
);

-- Enhanced stream_sessions table
CREATE TABLE IF NOT EXISTS stream_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL DEFAULT 'Live Stream',
  description TEXT,
  type stream_type NOT NULL DEFAULT 'instant',
  status stream_status NOT NULL DEFAULT 'pending',
  platforms TEXT[] NOT NULL DEFAULT '{}',
  products_featured UUID[] DEFAULT '{}',
  scheduled_start TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  ended_at TIMESTAMPTZ, -- Separate column for ended timestamp
  restream_event_id VARCHAR(100),
  restream_stream_id VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_status_transition CHECK (
    -- Basic status validation
    (status = 'pending' AND actual_start IS NULL) OR
    (status = 'live' AND actual_start IS NOT NULL AND actual_end IS NULL) OR
    (status = 'ended' AND actual_start IS NOT NULL AND actual_end IS NOT NULL) OR
    (status = 'error') OR
    (status = 'cancelled')
  ),
  
  CONSTRAINT valid_platforms CHECK (
    array_length(platforms, 1) > 0 AND
    array_length(platforms, 1) <= 10
  ),
  
  CONSTRAINT valid_title_length CHECK (
    length(title) >= 1 AND length(title) <= 200
  )
);

-- Webhook logs table for debugging and analytics
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type webhook_event_type NOT NULL,
  stream_session_id UUID REFERENCES stream_sessions(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_retry_count CHECK (retry_count >= 0 AND retry_count <= 5)
);

-- Stream health monitoring table
CREATE TABLE IF NOT EXISTS stream_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_session_id UUID NOT NULL REFERENCES stream_sessions(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'healthy' CHECK (status IN ('healthy', 'warning', 'critical', 'offline')),
  last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  bitrate INTEGER DEFAULT 0 CHECK (bitrate >= 0),
  fps INTEGER DEFAULT 0 CHECK (fps >= 0),
  dropped_frames INTEGER DEFAULT 0 CHECK (dropped_frames >= 0),
  network_quality INTEGER DEFAULT 100 CHECK (network_quality >= 0 AND network_quality <= 100),
  cpu_usage DECIMAL(5,2) DEFAULT 0 CHECK (cpu_usage >= 0 AND cpu_usage <= 100),
  memory_usage DECIMAL(5,2) DEFAULT 0 CHECK (memory_usage >= 0 AND memory_usage <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stream platform metrics for detailed analytics
CREATE TABLE IF NOT EXISTS stream_platform_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_session_id UUID NOT NULL REFERENCES stream_sessions(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  viewers_current INTEGER DEFAULT 0 CHECK (viewers_current >= 0),
  viewers_peak INTEGER DEFAULT 0 CHECK (viewers_peak >= 0),
  engaged_users INTEGER DEFAULT 0 CHECK (engaged_users >= 0),
  sales_count INTEGER DEFAULT 0 CHECK (sales_count >= 0),
  sales_total DECIMAL(10,2) DEFAULT 0 CHECK (sales_total >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint per stream session and platform
  UNIQUE(stream_session_id, platform)
);

-- Performance indexes for stream_sessions
CREATE INDEX IF NOT EXISTS idx_stream_sessions_seller_id ON stream_sessions(seller_id);
CREATE INDEX IF NOT EXISTS idx_stream_sessions_status ON stream_sessions(status);
CREATE INDEX IF NOT EXISTS idx_stream_sessions_type ON stream_sessions(type);
CREATE INDEX IF NOT EXISTS idx_stream_sessions_created_at ON stream_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stream_sessions_seller_status ON stream_sessions(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_stream_sessions_restream_stream_id ON stream_sessions(restream_stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_sessions_restream_event_id ON stream_sessions(restream_event_id);
CREATE INDEX IF NOT EXISTS idx_stream_sessions_platforms ON stream_sessions USING GIN(platforms);

-- Performance indexes for webhook_logs
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed ON webhook_logs(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_session_id ON webhook_logs(stream_session_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_retry_count ON webhook_logs(retry_count);

-- Performance indexes for stream_health_checks
CREATE INDEX IF NOT EXISTS idx_stream_health_session_id ON stream_health_checks(stream_session_id);
CREATE INDEX IF NOT EXISTS idx_stream_health_status ON stream_health_checks(status);
CREATE INDEX IF NOT EXISTS idx_stream_health_created_at ON stream_health_checks(created_at DESC);

-- Performance indexes for stream_platform_metrics
CREATE INDEX IF NOT EXISTS idx_platform_metrics_session_id ON stream_platform_metrics(stream_session_id);
CREATE INDEX IF NOT EXISTS idx_platform_metrics_platform ON stream_platform_metrics(platform);
CREATE INDEX IF NOT EXISTS idx_platform_metrics_created_at ON stream_platform_metrics(created_at DESC);

-- Updated_at trigger for stream_sessions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stream_sessions_updated_at
  BEFORE UPDATE ON stream_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Updated_at trigger for stream_platform_metrics
CREATE TRIGGER update_stream_platform_metrics_updated_at
  BEFORE UPDATE ON stream_platform_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE stream_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_platform_metrics ENABLE ROW LEVEL SECURITY;

-- Stream sessions RLS policies
CREATE POLICY "Users can view their own stream sessions" ON stream_sessions
  FOR SELECT USING (
    seller_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own stream sessions" ON stream_sessions
  FOR INSERT WITH CHECK (
    seller_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own stream sessions" ON stream_sessions
  FOR UPDATE USING (
    seller_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()
    )
  );

-- Webhook logs RLS policies (service access only)
CREATE POLICY "Service can access all webhook logs" ON webhook_logs
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- Stream health checks RLS policies (service access only)
CREATE POLICY "Service can access all stream health checks" ON stream_health_checks
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- Stream platform metrics RLS policies
CREATE POLICY "Users can view their own platform metrics" ON stream_platform_metrics
  FOR SELECT USING (
    stream_session_id IN (
      SELECT id FROM stream_sessions WHERE 
        seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Service can manage all platform metrics" ON stream_platform_metrics
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- Function to get active stream for a seller
CREATE OR REPLACE FUNCTION get_active_stream(p_seller_id UUID)
RETURNS TABLE (
  id UUID,
  title VARCHAR,
  status stream_status,
  platforms TEXT[],
  created_at TIMESTAMPTZ,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ss.id,
    ss.title,
    ss.status,
    ss.platforms,
    ss.created_at,
    ss.metadata
  FROM stream_sessions ss
  WHERE ss.seller_id = p_seller_id
    AND ss.status IN ('pending', 'live')
  ORDER BY ss.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old webhook logs (maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_logs(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM webhook_logs 
  WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old health checks (maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_health_checks(hours_to_keep INTEGER DEFAULT 24)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM stream_health_checks 
  WHERE created_at < NOW() - INTERVAL '1 hour' * hours_to_keep;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to service role for maintenance functions
GRANT EXECUTE ON FUNCTION cleanup_old_webhook_logs TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_health_checks TO service_role;

-- Create view for stream analytics
CREATE OR REPLACE VIEW stream_analytics AS
SELECT 
  ss.id,
  ss.seller_id,
  ss.title,
  ss.status,
  ss.type,
  ss.platforms,
  ss.actual_start,
  ss.actual_end,
  ss.created_at,
  ss.metadata,
  -- Calculate duration in minutes
  CASE 
    WHEN ss.actual_start IS NOT NULL AND ss.actual_end IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (ss.actual_end - ss.actual_start)) / 60
    ELSE NULL
  END as duration_minutes,
  -- Peak viewers from metadata
  (ss.metadata->>'peak_viewers')::INTEGER as peak_viewers,
  -- Total viewers from metadata
  (ss.metadata->>'total_viewers')::INTEGER as total_viewers
FROM stream_sessions ss;

-- Grant permissions on analytics view
GRANT SELECT ON stream_analytics TO authenticated;
GRANT SELECT ON stream_analytics TO service_role;

-- Add comments for documentation
COMMENT ON TABLE stream_sessions IS 'Enhanced stream sessions with proper status tracking and metadata';
COMMENT ON TABLE webhook_logs IS 'Webhook event logs for debugging and analytics';
COMMENT ON TABLE stream_health_checks IS 'Stream health monitoring metrics';
COMMENT ON TABLE stream_platform_metrics IS 'Per-platform streaming metrics and analytics';
COMMENT ON VIEW stream_analytics IS 'Stream analytics view with calculated metrics';

COMMENT ON COLUMN stream_sessions.metadata IS 'JSON metadata containing OBS config, webhook data, error details, and other stream information';
COMMENT ON COLUMN webhook_logs.payload IS 'Raw webhook payload for debugging and replay';
COMMENT ON COLUMN stream_health_checks.network_quality IS 'Network quality percentage (0-100)';
COMMENT ON COLUMN stream_platform_metrics.sales_total IS 'Total sales revenue for this platform during the stream';
