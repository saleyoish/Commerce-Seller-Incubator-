-- ============================================
-- COMBINED FIXES FOR MIGRATION ISSUES
-- ============================================

-- Fix 1: Update seller_rankings view to use email instead of first_name/last_name
DROP MATERIALIZED VIEW IF EXISTS seller_rankings;

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

-- Fix 2: Secure views using SECURITY DEFINER functions instead of direct view access

-- Create admin-only function for platform_performance_summary
CREATE OR REPLACE FUNCTION get_platform_performance_summary()
RETURNS TABLE (
  platform TEXT,
  total_sales BIGINT,
  total_revenue DECIMAL,
  total_platform_fees DECIMAL,
  total_our_commission DECIMAL,
  total_seller_payouts DECIMAL,
  avg_sale_amount DECIMAL,
  unique_sellers BIGINT
) AS $$
BEGIN
  RETURN QUERY
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create admin-only function for pending_manual_sales
CREATE OR REPLACE FUNCTION get_pending_manual_sales()
RETURNS TABLE (
  id UUID,
  seller_id UUID,
  platform TEXT,
  product_id UUID,
  product_name TEXT,
  sale_amount DECIMAL,
  platform_fee DECIMAL,
  our_commission DECIMAL,
  seller_payout DECIMAL,
  external_sale_id TEXT,
  buyer_info JSONB,
  sale_date TIMESTAMP WITH TIME ZONE,
  payout_status TEXT,
  entry_type TEXT,
  verification_status TEXT,
  verified_by UUID,
  verified_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  seller_email TEXT,
  seller_phone TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.*,
    s.email AS seller_email,
    s.phone AS seller_phone
  FROM platform_sales ps
  JOIN sellers s ON ps.seller_id = s.id
  WHERE ps.entry_type = 'manual'
    AND ps.verification_status = 'pending'
  ORDER BY ps.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create admin-only function for upcoming_streams
CREATE OR REPLACE FUNCTION get_upcoming_streams()
RETURNS TABLE (
  id UUID,
  seller_id UUID,
  title TEXT,
  description TEXT,
  scheduled_start TIMESTAMP WITH TIME ZONE,
  actual_start TIMESTAMP WITH TIME ZONE,
  actual_end TIMESTAMP WITH TIME ZONE,
  status TEXT,
  platforms TEXT[],
  restream_event_id TEXT,
  products_featured UUID[],
  thumbnail_url TEXT,
  total_viewers INTEGER,
  peak_viewers INTEGER,
  total_sales DECIMAL,
  reminder_sent_24h BOOLEAN,
  reminder_sent_1h BOOLEAN,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  seller_email TEXT,
  platform_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ss.*,
    s.email AS seller_email,
    array_length(ss.platforms, 1) AS platform_count
  FROM stream_sessions ss
  JOIN sellers s ON ss.seller_id = s.id
  WHERE ss.status = 'scheduled'
    AND ss.scheduled_start > NOW()
  ORDER BY ss.scheduled_start ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create admin-only function for training_completion_stats
CREATE OR REPLACE FUNCTION get_training_completion_stats()
RETURNS TABLE (
  seller_id UUID,
  email TEXT,
  completed_modules BIGINT,
  total_modules INTEGER,
  completion_percentage INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as seller_id,
    s.email,
    COUNT(DISTINCT tp.module_id) as completed_modules,
    8 as total_modules,
    ROUND((COUNT(DISTINCT tp.module_id) / 8.0) * 100) as completion_percentage
  FROM sellers s
  LEFT JOIN training_progress tp ON s.id = tp.seller_id AND tp.completed = true
  GROUP BY s.id, s.email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create admin-only function for referral_stats
CREATE OR REPLACE FUNCTION get_referral_stats()
RETURNS TABLE (
  referrer_id UUID,
  referrer_email TEXT,
  total_referrals BIGINT,
  approved_referrals BIGINT,
  active_referrals BIGINT,
  paid_referrals BIGINT,
  total_bonus_paid DECIMAL,
  pending_bonus_amount DECIMAL
) AS $$
BEGIN
  RETURN QUERY
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create admin-only function for pending_clips_for_moderation
CREATE OR REPLACE FUNCTION get_pending_clips_for_moderation()
RETURNS TABLE (
  id UUID,
  clip_number INTEGER,
  start_time INTEGER,
  duration INTEGER,
  thumbnail_path TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  source TEXT,
  mux_playback_id TEXT,
  seller_email TEXT,
  seller_id UUID,
  stream_title TEXT,
  transcript_text TEXT
) AS $$
BEGIN
  RETURN QUERY
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create admin-only function for clips_ready_for_posting
CREATE OR REPLACE FUNCTION get_clips_ready_for_posting()
RETURNS TABLE (
  id UUID,
  stream_recording_id UUID,
  seller_id UUID,
  clip_number INTEGER,
  generation_method TEXT,
  start_time INTEGER,
  duration INTEGER,
  raw_clip_path TEXT,
  final_clip_path TEXT,
  thumbnail_path TEXT,
  caption_file_path TEXT,
  status TEXT,
  approved BOOLEAN,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected BOOLEAN,
  rejection_reason TEXT,
  posted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  mux_playback_id TEXT,
  transcript_text TEXT,
  caption_style TEXT,
  account_id UUID,
  platform TEXT,
  platform_username TEXT,
  auto_post_enabled BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create admin-only function for seller_rankings
CREATE OR REPLACE FUNCTION get_seller_rankings()
RETURNS TABLE (
  seller_id UUID,
  email TEXT,
  seller_name TEXT,
  total_shows BIGINT,
  total_sales DECIMAL,
  total_commission DECIMAL,
  avg_sale_amount DECIMAL,
  last_sale_date TIMESTAMP WITH TIME ZONE,
  rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id AS seller_id,
    s.email,
    s.email AS seller_name,
    COUNT(DISTINCT ss.id) AS total_shows,
    COALESCE(SUM(ps.sale_amount), 0) AS total_sales,
    COALESCE(SUM(ps.our_commission), 0) AS total_commission,
    COALESCE(AVG(ps.sale_amount), 0) AS avg_sale_amount,
    MAX(ps.sale_date) AS last_sale_date,
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(ps.sale_amount), 0) DESC) AS rank
  FROM sellers s
  LEFT JOIN stream_sessions ss ON s.id = ss.seller_id AND ss.status = 'ended'
  LEFT JOIN platform_sales ps ON s.id = ps.seller_id AND ps.verification_status = 'verified'
  GROUP BY s.id, s.email
  ORDER BY total_sales DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for seller_rankings
CREATE UNIQUE INDEX IF NOT EXISTS idx_seller_rankings_seller_id ON seller_rankings(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_rankings_total_sales ON seller_rankings(total_sales DESC);
CREATE INDEX IF NOT EXISTS idx_seller_rankings_rank ON seller_rankings(rank);

-- Refresh materialized view
REFRESH MATERIALIZED VIEW seller_rankings;
