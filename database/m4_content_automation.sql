-- ============================================
-- M4: Content Automation - Database Schema
-- ============================================

-- ============================================
-- 1. STREAM_RECORDINGS TABLE
-- ============================================
CREATE TABLE stream_recordings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stream_session_id UUID REFERENCES stream_sessions(id),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE NOT NULL,
  source TEXT NOT NULL, -- 'restream', 'manual_upload', 'tiktok', 'whatnot'
  original_url TEXT,
  storage_path TEXT,
  file_size BIGINT,
  duration INTEGER,
  resolution TEXT,
  format TEXT,
  download_status TEXT DEFAULT 'pending', -- pending, downloading, completed, failed
  processing_status TEXT DEFAULT 'pending', -- pending, processing, ready, failed
  mux_asset_id TEXT, -- For Mux processing
  mux_playback_id TEXT, -- For Mux playback
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE stream_recordings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "sellers_own_recordings" ON stream_recordings
  FOR ALL USING (
    seller_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "admins_all_recordings" ON stream_recordings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
    )
  );

-- ============================================
-- 2. GENERATED_CLIPS TABLE
-- ============================================
CREATE TABLE generated_clips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stream_recording_id UUID REFERENCES stream_recordings(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE NOT NULL,
  clip_number INTEGER,
  generation_method TEXT, -- 'interval', 'audio_peak', 'mux_smart'
  start_time INTEGER, -- Start time in seconds from stream beginning
  duration INTEGER, -- Duration in seconds
  raw_clip_path TEXT,
  final_clip_path TEXT,
  thumbnail_path TEXT,
  caption_file_path TEXT,
  status TEXT DEFAULT 'pending', -- pending, generating, captioning, ready, failed
  approved BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected BOOLEAN DEFAULT FALSE,
  rejection_reason TEXT,
  posted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE generated_clips ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "sellers_own_clips" ON generated_clips
  FOR ALL USING (
    seller_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "admins_all_clips" ON generated_clips
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
    )
  );

-- ============================================
-- 3. CLIP_CAPTIONS TABLE
-- ============================================
CREATE TABLE clip_captions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clip_id UUID REFERENCES generated_clips(id) ON DELETE CASCADE,
  transcript_text TEXT,
  srt_content TEXT,
  srt_file_path TEXT,
  language TEXT DEFAULT 'en',
  word_count INTEGER,
  assemblyai_transcript_id TEXT,
  caption_style TEXT DEFAULT 'classic', -- classic, bold, minimal
  confidence_score DECIMAL(4,3),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE clip_captions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "sellers_own_captions" ON clip_captions
  FOR ALL USING (
    clip_id IN (
      SELECT gc.id FROM generated_clips gc
      WHERE gc.seller_id IN (
        SELECT id FROM sellers WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "admins_all_captions" ON clip_captions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
    )
  );

-- ============================================
-- 4. SOCIAL_MEDIA_ACCOUNTS TABLE
-- ============================================
CREATE TABLE social_media_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL, -- 'youtube', 'instagram', 'tiktok', 'facebook'
  platform_user_id TEXT,
  platform_username TEXT,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  auto_post_enabled BOOLEAN DEFAULT TRUE,
  default_caption_template TEXT DEFAULT 'Check out this clip from my live stream! 🔥',
  status TEXT DEFAULT 'active', -- active, expired, disconnected
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_post_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE social_media_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "sellers_own_accounts" ON social_media_accounts
  FOR ALL USING (
    seller_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "admins_all_accounts" ON social_media_accounts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
    )
  );

-- ============================================
-- 5. SOCIAL_MEDIA_POSTS TABLE
-- ============================================
CREATE TABLE social_media_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clip_id UUID REFERENCES generated_clips(id) ON DELETE SET NULL,
  social_media_account_id UUID REFERENCES social_media_accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'youtube', 'instagram', 'tiktok', 'facebook'
  platform_post_id TEXT,
  platform_post_url TEXT,
  caption TEXT,
  hashtags TEXT[],
  status TEXT DEFAULT 'pending', -- pending, scheduled, posting, posted, failed
  scheduled_for TIMESTAMP WITH TIME ZONE,
  posted_at TIMESTAMP WITH TIME ZONE,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE social_media_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "sellers_own_posts" ON social_media_posts
  FOR ALL USING (
    social_media_account_id IN (
      SELECT sma.id FROM social_media_accounts sma
      WHERE sma.seller_id IN (
        SELECT id FROM sellers WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "admins_all_posts" ON social_media_posts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
    )
  );

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_stream_recordings_seller_id ON stream_recordings(seller_id);
CREATE INDEX idx_stream_recordings_session_id ON stream_recordings(stream_session_id);
CREATE INDEX idx_stream_recordings_status ON stream_recordings(processing_status);
CREATE INDEX idx_generated_clips_recording_id ON generated_clips(stream_recording_id);
CREATE INDEX idx_generated_clips_seller_id ON generated_clips(seller_id);
CREATE INDEX idx_generated_clips_status ON generated_clips(status);
CREATE INDEX idx_generated_clips_approved ON generated_clips(approved) WHERE approved = FALSE;
CREATE INDEX idx_clip_captions_clip_id ON clip_captions(clip_id);
CREATE INDEX idx_social_accounts_seller_id ON social_media_accounts(seller_id);
CREATE INDEX idx_social_accounts_platform ON social_media_accounts(platform);
CREATE INDEX idx_social_posts_account_id ON social_media_posts(social_media_account_id);
CREATE INDEX idx_social_posts_clip_id ON social_media_posts(clip_id);
CREATE INDEX idx_social_posts_status ON social_media_posts(status);
CREATE INDEX idx_social_posts_scheduled ON social_media_posts(scheduled_for) WHERE status = 'scheduled';

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE TRIGGER update_stream_recordings_updated_at BEFORE UPDATE ON stream_recordings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generated_clips_updated_at BEFORE UPDATE ON generated_clips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_social_media_accounts_updated_at BEFORE UPDATE ON social_media_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_social_media_posts_updated_at BEFORE UPDATE ON social_media_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STORAGE BUCKETS (Run via Supabase Dashboard)
-- ============================================
-- Bucket: stream-recordings (Private, 10GB limit)
-- Bucket: generated-clips (Public, 2GB limit)
-- Bucket: clip-thumbnails (Public, 500MB limit)
-- Bucket: captions (Private, 500MB limit)

-- ============================================
-- VIEWS FOR CONVENIENCE
-- ============================================

-- View: Pending clips for admin moderation
CREATE OR REPLACE VIEW pending_clips_for_moderation AS
SELECT 
  gc.id,
  gc.clip_number,
  gc.start_time,
  gc.duration,
  gc.thumbnail_path,
  gc.status,
  gc.created_at,
  sr.source,
  sr.mux_playback_id,
  s.email as seller_email,
  s.id as seller_id,
  ss.title as stream_title,
  cc.transcript_text
FROM generated_clips gc
JOIN stream_recordings sr ON gc.stream_recording_id = sr.id
JOIN sellers s ON gc.seller_id = s.id
JOIN stream_sessions ss ON sr.stream_session_id = ss.id
LEFT JOIN clip_captions cc ON cc.clip_id = gc.id
WHERE gc.status = 'ready' 
  AND gc.approved = FALSE 
  AND gc.rejected = FALSE
ORDER BY gc.created_at DESC;

-- View: Clips ready for posting
CREATE OR REPLACE VIEW clips_ready_for_posting AS
SELECT 
  gc.*,
  sr.mux_playback_id,
  cc.transcript_text,
  cc.caption_style,
  sma.id as account_id,
  sma.platform,
  sma.platform_username,
  sma.auto_post_enabled
FROM generated_clips gc
JOIN stream_recordings sr ON gc.stream_recording_id = sr.id
LEFT JOIN clip_captions cc ON cc.clip_id = gc.id
JOIN social_media_accounts sma ON gc.seller_id = sma.seller_id
WHERE gc.approved = TRUE
  AND gc.posted_at IS NULL
  AND sma.status = 'active';
