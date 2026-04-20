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
  return createBrowserClient(supabaseUrl!, supabasePublishableKey!);
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
