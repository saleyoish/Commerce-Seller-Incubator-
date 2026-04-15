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
