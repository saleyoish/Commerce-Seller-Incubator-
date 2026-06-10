-- Add missing features for Phases 1-4

-- Add TikTok Shop affiliate fields to sellers table
ALTER TABLE sellers 
ADD COLUMN IF NOT EXISTS tiktok_affiliate_status TEXT DEFAULT 'not_registered',
ADD COLUMN IF NOT EXISTS tiktok_business_type TEXT,
ADD COLUMN IF NOT EXISTS tiktok_business_name TEXT,
ADD COLUMN IF NOT EXISTS tiktok_tax_id TEXT,
ADD COLUMN IF NOT EXISTS tiktok_business_address TEXT;

-- Create stream_reminders table for automated scheduler
CREATE TABLE IF NOT EXISTS stream_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_session_id UUID NOT NULL REFERENCES stream_sessions(id) ON DELETE CASCADE,
  reminder_time TIMESTAMPTZ NOT NULL,
  reminder_type TEXT NOT NULL, -- '15 min', '1 hour', '1 day'
  sent BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_reminder_type CHECK (reminder_type IN ('15 min', '1 hour', '1 day'))
);

-- Create social_posts table for content automation
CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id UUID NOT NULL REFERENCES generated_clips(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'tiktok', 'instagram', 'youtube'
  post_id TEXT,
  caption TEXT,
  hashtags TEXT[],
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'scheduled', 'posted', 'failed'
  scheduled_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_platform CHECK (platform IN ('tiktok', 'instagram', 'youtube')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'scheduled', 'posted', 'failed'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stream_reminders_session_id ON stream_reminders(stream_session_id);
CREATE INDEX IF NOT EXISTS idx_stream_reminders_reminder_time ON stream_reminders(reminder_time);
CREATE INDEX IF NOT EXISTS idx_stream_reminders_sent ON stream_reminders(sent);

CREATE INDEX IF NOT EXISTS idx_social_posts_clip_id ON social_posts(clip_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_seller_id ON social_posts(seller_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_platform ON social_posts(platform);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled_at ON social_posts(scheduled_at);

-- Enable RLS
ALTER TABLE stream_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;

-- RLS policies for stream_reminders
CREATE POLICY "Sellers can view their own reminders" ON stream_reminders
  FOR SELECT USING (
    stream_session_id IN (
      SELECT id FROM stream_sessions WHERE 
        seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Service can manage all reminders" ON stream_reminders
  FOR ALL USING (auth.role() = 'service_role');

-- RLS policies for social_posts
CREATE POLICY "Sellers can view their own social posts" ON social_posts
  FOR SELECT USING (seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()));

CREATE POLICY "Sellers can insert their own social posts" ON social_posts
  FOR INSERT WITH CHECK (seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()));

CREATE POLICY "Sellers can update their own social posts" ON social_posts
  FOR UPDATE USING (seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()));

CREATE POLICY "Service can manage all social posts" ON social_posts
  FOR ALL USING (auth.role() = 'service_role');

-- Add updated_at trigger for social_posts
CREATE TRIGGER update_social_posts_updated_at
  BEFORE UPDATE ON social_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE stream_reminders IS 'Automated reminders for scheduled streams';
COMMENT ON TABLE social_posts IS 'Social media posts generated from clips';
COMMENT ON COLUMN sellers.tiktok_affiliate_status IS 'TikTok Shop affiliate registration status';
COMMENT ON COLUMN social_posts.platform IS 'Social media platform (tiktok, instagram, youtube)';
