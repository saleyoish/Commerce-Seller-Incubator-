// Client-side Supabase client (uses publishable key)
// This file can be imported in both Client and Server Components

import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabasePublishableKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variable');
}

export const createClientSideSupabase = () => {
  // Let @supabase/ssr handle all cookie logic natively — it uses
  // document.cookie correctly and handles URL-encoded values / chunked
  // tokens out of the box. Custom cookie implementations break in
  // production when tokens contain '=' characters.
  const client = createBrowserClient(supabaseUrl!, supabasePublishableKey!, {
    global: {
      headers: {
        'x-my-custom-header': 'commerce-seller-incubator',
        'Prefer': 'return=representation'
      }
    }
  });

  // Handle auth errors (e.g., invalid refresh token)
  client.auth.onAuthStateChange((event) => {
    if (event === 'TOKEN_REFRESHED') {
      console.log('Token refreshed successfully');
    }
  });

  return client;
};

// Helper to handle auth errors gracefully
export const handleAuthError = async (error: any) => {
  if (error?.code === 'refresh_token_not_found' || 
      error?.message?.includes('refresh_token_not_found') ||
      error?.code === 'Invalid Refresh Token') {
    console.warn('Invalid refresh token detected, signing out user');
    const supabase = createClientSideSupabase();
    await supabase.auth.signOut();
    // Clear any stored auth data
    if (typeof window !== 'undefined') {
      window.location.href = '/login?error=session_expired';
    }
  }
};

// Types for database tables
export type Seller = {
  id: string;
  user_id: string;
  email: string;
  phone: string;
  stripe_account_id: string | null;
  stripe_onboarding_status: string;
  approval_status: string;
  stream_embed_url: string | null;
  schedule_text: string | null;
  restream_username: string | null;
  restream_stream_key: string | null;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  seller_id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  stock_quantity: number;
  images: string[];
  status: string;
  created_at: string;
  updated_at: string;
};

export type Sale = {
  id: string;
  seller_id: string;
  product_id: string;
  amount: number;
  platform_fee: number;
  stripe_payment_intent_id: string | null;
  status: string;
  created_at: string;
};

export type Admin = {
  id: string;
  user_id: string;
  email: string;
  created_at: string;
};

// ============================================
// M3: Multi-Stream Expansion Types
// ============================================

export type Platform = 'tiktok' | 'whatnot' | 'youtube' | 'facebook' | 'instagram' | 'platform_site';

export type PlatformConnection = {
  id: string;
  seller_id: string;
  platform: Platform;
  status: 'pending' | 'connected' | 'disconnected' | 'failed';
  platform_username: string | null;
  platform_user_id: string | null;
  platform_category: string | null;
  platform_bio: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  metadata: Record<string, any>;
  connected_at: string | null;
  disconnected_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PlatformSale = {
  id: string;
  seller_id: string;
  platform: Platform;
  product_id: string | null;
  product_name: string | null;
  sale_amount: number;
  platform_fee: number;
  our_commission: number;
  seller_payout: number;
  external_sale_id: string | null;
  buyer_info: Record<string, any>;
  sale_date: string;
  payout_status: 'pending' | 'processing' | 'completed' | 'failed';
  entry_type: 'automatic' | 'manual';
  verification_status: 'verified' | 'pending' | 'rejected';
  verified_by: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  receipt_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type StreamSession = {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  scheduled_start: string | null;
  actual_start: string | null;
  actual_end: string | null;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  platforms: Platform[];
  restream_event_id: string | null;
  products_featured: string[];
  thumbnail_url: string | null;
  total_viewers: number;
  peak_viewers: number;
  total_sales: number;
  reminder_sent_24h: boolean;
  reminder_sent_1h: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
};

export type StreamPlatformMetrics = {
  id: string;
  stream_session_id: string;
  platform: Platform;
  viewers_current: number;
  viewers_peak: number;
  chat_messages: number;
  sales_count: number;
  sales_total: number;
  recorded_at: string;
};

export type SellerRanking = {
  seller_id: string;
  email: string;
  seller_name: string;
  total_shows: number;
  total_sales: number;
  total_commission: number;
  avg_sale_amount: number;
  last_sale_date: string | null;
  rank: number;
};

// ============================================
// M4: Content Automation Types
// ============================================

export type StreamRecording = {
  id: string;
  stream_session_id: string | null;
  seller_id: string;
  source: 'restream' | 'manual_upload' | 'tiktok' | 'whatnot';
  original_url: string | null;
  storage_path: string | null;
  file_size: number | null;
  duration: number | null;
  resolution: string | null;
  format: string | null;
  download_status: 'pending' | 'downloading' | 'completed' | 'failed';
  processing_status: 'pending' | 'processing' | 'ready' | 'failed';
  mux_asset_id: string | null;
  mux_playback_id: string | null;
  created_at: string;
  updated_at: string;
};

export type GeneratedClip = {
  id: string;
  stream_recording_id: string;
  seller_id: string;
  clip_number: number;
  generation_method: 'interval' | 'audio_peak' | 'mux_smart' | null;
  start_time: number;
  duration: number;
  raw_clip_path: string | null;
  final_clip_path: string | null;
  thumbnail_path: string | null;
  caption_file_path: string | null;
  status: 'pending' | 'generating' | 'captioning' | 'ready' | 'failed';
  approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  rejected: boolean;
  rejection_reason: string | null;
  posted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ClipCaption = {
  id: string;
  clip_id: string;
  transcript_text: string | null;
  srt_content: string | null;
  srt_file_path: string | null;
  language: string;
  word_count: number | null;
  assemblyai_transcript_id: string | null;
  caption_style: 'classic' | 'bold' | 'minimal';
  confidence_score: number | null;
  created_at: string;
};

export type SocialMediaAccount = {
  id: string;
  seller_id: string;
  platform: 'youtube' | 'instagram' | 'tiktok' | 'facebook';
  platform_user_id: string | null;
  platform_username: string | null;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  token_expires_at: string | null;
  auto_post_enabled: boolean;
  default_caption_template: string;
  status: 'active' | 'expired' | 'disconnected';
  connected_at: string | null;
  last_post_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SocialPost = {
  id: string;
  clip_id: string;
  seller_id: string;
  platform: string;
  post_id: string | null;
  caption: string | null;
  hashtags: string[] | null;
  status: string;
  scheduled_at: string | null;
  posted_at: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

export type SocialMediaPost = {
  id: string;
  clip_id: string | null;
  social_media_account_id: string;
  platform: 'youtube' | 'instagram' | 'tiktok' | 'facebook';
  platform_post_id: string | null;
  platform_post_url: string | null;
  caption: string | null;
  hashtags: string[] | null;
  status: 'pending' | 'scheduled' | 'posting' | 'posted' | 'failed';
  scheduled_for: string | null;
  posted_at: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
};
