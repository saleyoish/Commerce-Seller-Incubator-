// API route for managing social media accounts
import { NextRequest, NextResponse } from 'next/server';
import { extractToken, verifyJWT } from '@/lib/jwt';
import { db } from '@/lib/db';
import { createAdminSupabase } from '@/lib/supabase-admin';
import type { SocialMediaAccount } from '@/lib/supabase-client';

// GET: List connected social media accounts
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const token = extractToken(request.headers);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { data: seller } = await db
      .from('sellers')
      .select('id')
      .eq('id', payload.userId)
      .maybeSingle();

    const { data: adminData } = await db
      .from('admins')
      .select('id')
      .eq('id', payload.userId)
      .maybeSingle();

    if (!seller && !adminData) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    let accounts: any[] = [];
    let error = null;

    if (seller) {
      const result = await db
        .from('social_media_accounts')
        .select('*')
        .eq('seller_id', seller.id)
        .order('created_at', { ascending: false });
      accounts = result.data || [];
      error = result.error;
    }

    if (error) {
      console.error('Error fetching accounts:', error);
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
    }

    const sanitizedAccounts = accounts?.map((acc: SocialMediaAccount) => ({
      id: acc.id,
      platform: acc.platform,
      platform_username: acc.platform_username,
      auto_post_enabled: acc.auto_post_enabled,
      status: acc.status,
      connected_at: acc.connected_at,
      last_post_at: acc.last_post_at,
    }));

    return NextResponse.json({ accounts: sanitizedAccounts });
  } catch (error) {
    console.error('Error in accounts GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Store new social media account (after OAuth flow)
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const token = extractToken(request.headers);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const body = await request.json();
    const {
      platform,
      platformUserId,
      platformUsername,
      accessToken,
      refreshToken,
      tokenExpiresAt,
    } = body;

    if (!platform || !accessToken) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: seller } = await db
      .from('sellers')
      .select('id')
      .eq('id', payload.userId)
      .single();

    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    const adminSupabase = createAdminSupabase();

    const { data: existing } = await adminSupabase
      .from('social_media_accounts')
      .select('id')
      .eq('seller_id', seller.id)
      .eq('platform', platform)
      .single();

    if (existing) {
      const { data: updated, error } = await adminSupabase
        .from('social_media_accounts')
        .update({
          platform_user_id: platformUserId,
          platform_username: platformUsername,
          access_token_encrypted: accessToken,
          refresh_token_encrypted: refreshToken,
          token_expires_at: tokenExpiresAt,
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating account:', error);
        return NextResponse.json({ error: 'Failed to update account' }, { status: 500 });
      }

      return NextResponse.json({ message: 'Account updated successfully', account: updated });
    }

    const { data: account, error } = await adminSupabase
      .from('social_media_accounts')
      .insert({
        seller_id: seller.id,
        platform,
        platform_user_id: platformUserId,
        platform_username: platformUsername,
        access_token_encrypted: accessToken,
        refresh_token_encrypted: refreshToken,
        token_expires_at: tokenExpiresAt,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating account:', error);
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Account connected successfully', account });
  } catch (error) {
    console.error('Error in accounts POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
