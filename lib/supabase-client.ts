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
  const client = createBrowserClient(supabaseUrl!, supabasePublishableKey!, {
    cookies: {
      get(name: string) {
        if (typeof document === 'undefined') return undefined;
        const cookie = document.cookie
          .split('; ')
          .find((row) => row.startsWith(`${name}=`));
        return cookie ? cookie.split('=')[1] : undefined;
      },
      set(name: string, value: string, options: any) {
        if (typeof document === 'undefined') return;
        let cookie = `${name}=${value}`;
        if (options.maxAge) cookie += `; Max-Age=${options.maxAge}`;
        if (options.path) cookie += `; Path=${options.path}`;
        if (options.domain) cookie += `; Domain=${options.domain}`;
        if (options.secure) cookie += `; Secure`;
        if (options.sameSite) cookie += `; SameSite=${options.sameSite}`;
        document.cookie = cookie;
      },
      remove(name: string, options: any) {
        if (typeof document === 'undefined') return;
        document.cookie = `${name}=; Max-Age=0; Path=${options?.path || '/'}; SameSite=${options?.sameSite || 'Lax'}`;
      },
    },
  });

  // Handle auth errors (e.g., invalid refresh token)
  client.auth.onAuthStateChange((event, session) => {
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
