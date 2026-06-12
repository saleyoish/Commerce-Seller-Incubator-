import { exchangeShortLivedToken } from '@/lib/meta-service';
import { verifyJWT, extractToken } from '@/lib/jwt';
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

const META_APP_ID = process.env.META_APP_ID || '';
const META_APP_SECRET = process.env.META_APP_SECRET || '';
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const REDIRECT_URI = BASE_URL + '/api/facebook/callback';

export async function GET(request: NextRequest) {
  try {
    console.log('[FACEBOOK-CALLBACK] OAuth callback received');
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const state = searchParams.get('state');

    if (error) {
      console.log('[FACEBOOK-CALLBACK] OAuth error:', error);
      console.log('[FACEBOOK-CALLBACK] Error description:', errorDescription);
      console.log('[FACEBOOK-CALLBACK] Full error details:', { error, errorDescription });
      return NextResponse.redirect(
        `${BASE_URL}/seller/platforms/meta-commerce-shop?error=${encodeURIComponent(errorDescription || error)}&error_type=${encodeURIComponent(error)}`
      );
    }

    if (!code) {
      console.log('[FACEBOOK-CALLBACK] No authorization code received');
      return NextResponse.redirect(`${BASE_URL}/seller/platforms/meta-commerce-shop?error=No authorization code received`);
    }

    // Exchange code for short-lived token
    const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', META_APP_ID);
    tokenUrl.searchParams.set('client_secret', META_APP_SECRET);
    tokenUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    tokenUrl.searchParams.set('code', code);

    const tokenResponse = await fetch(tokenUrl.toString());
    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      const errorMsg = tokenData.error?.message || 'Failed to exchange token';
      console.error('[FACEBOOK-CALLBACK] Token exchange error:', tokenData);
      return NextResponse.redirect(
        `${BASE_URL}/seller/platforms/meta-commerce-shop?error=${encodeURIComponent(errorMsg)}`
      );
    }

    // Exchange short-lived token for long-lived token
    let longLivedToken = tokenData.access_token;
    try {
      const exchanged = await exchangeShortLivedToken(META_APP_ID, META_APP_SECRET, tokenData.access_token);
      longLivedToken = exchanged.access_token;
      console.log('[FACEBOOK-CALLBACK] Long-lived token obtained');
    } catch (exchangeError) {
      console.warn('[FACEBOOK-CALLBACK] Could not exchange for long-lived token, using short-lived:', exchangeError);
      // Continue with short-lived token if exchange fails
    }

    // Get authenticated user from JWT token (from state parameter)
    console.log('[FACEBOOK-CALLBACK] Extracting JWT token from state parameter');
    let token = null;
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        token = stateData.token;
        console.log('[FACEBOOK-CALLBACK] JWT token extracted from state:', !!token);
      } catch (e) {
        console.error('[FACEBOOK-CALLBACK] Failed to parse state:', e);
      }
    }
    
    if (!token) {
      console.log('[FACEBOOK-CALLBACK] No JWT token found in state, trying headers');
      token = extractToken(request.headers);
    }
    
    if (!token) {
      console.log('[FACEBOOK-CALLBACK] No JWT token found, redirecting to login');
      return NextResponse.redirect(`${BASE_URL}/login?error=Authentication required`);
    }

    console.log('[FACEBOOK-CALLBACK] Verifying JWT token');
    const payload = await verifyJWT(token);
    
    if (!payload) {
      console.log('[FACEBOOK-CALLBACK] Invalid JWT token, redirecting to login');
      return NextResponse.redirect(`${BASE_URL}/login?error=Invalid token`);
    }

    console.log('[FACEBOOK-CALLBACK] JWT token verified, userId:', payload.userId);

    // Get seller record using JWT userId (custom auth uses id, not user_id)
    const { data: sellerData } = await db
      .from('sellers')
      .select('*')
      .eq('id', payload.userId)
      .maybeSingle();

    if (!sellerData) {
      console.log('[FACEBOOK-CALLBACK] Seller not found, redirecting to signup');
      return NextResponse.redirect(`${BASE_URL}/signup?error=Seller account not found`);
    }

    console.log('[FACEBOOK-CALLBACK] Seller found:', sellerData.email);

    // Get Facebook user info
    const userUrl = new URL('https://graph.facebook.com/v19.0/me');
    userUrl.searchParams.set('access_token', longLivedToken);
    userUrl.searchParams.set('fields', 'id,name');

    const userResponse = await fetch(userUrl.toString());
    const userData = await userResponse.json();

    const facebookUserId = userData.id || null;
    const facebookUserName = userData.name || null;

    console.log('[FACEBOOK-CALLBACK] Facebook user:', facebookUserName);

    // Check if connection already exists (check both meta and facebook for migration)
    const { data: existingMetaConnection } = await db
      .from('platform_connections')
      .select('*')
      .eq('seller_id', sellerData.id)
      .eq('platform', 'meta')
      .maybeSingle();

    const { data: existingFacebookConnection } = await db
      .from('platform_connections')
      .select('*')
      .eq('seller_id', sellerData.id)
      .eq('platform', 'facebook')
      .maybeSingle();

    const existingConnection = existingMetaConnection || existingFacebookConnection;

    const connectionRecord = {
      seller_id: sellerData.id,
      platform: 'meta',
      status: 'connected',
      platform_username: facebookUserName,
      platform_user_id: facebookUserId,
      access_token: longLivedToken,
      metadata: {
        access_token: longLivedToken,
        pageName: facebookUserName,
        last_product_sync_at: existingConnection?.metadata?.last_product_sync_at || null,
      },
      connected_at: new Date().toISOString(),
    };

    let result;
    if (existingMetaConnection) {
      console.log('[FACEBOOK-CALLBACK] Updating existing Meta connection');
      result = await db
        .from('platform_connections')
        .update(connectionRecord)
        .eq('id', existingMetaConnection.id)
        .select()
        .single();
    } else if (existingFacebookConnection) {
      console.log('[FACEBOOK-CALLBACK] Migrating Facebook connection to Meta');
      // Migrate facebook connection to meta
      await db
        .from('platform_connections')
        .delete()
        .eq('id', existingFacebookConnection.id);
      result = await db
        .from('platform_connections')
        .insert(connectionRecord)
        .select()
        .single();
    } else {
      console.log('[FACEBOOK-CALLBACK] Creating new Meta connection');
      result = await db
        .from('platform_connections')
        .insert(connectionRecord)
        .select()
        .single();
    }

    if (result.error) {
      console.error('[FACEBOOK-CALLBACK] Error saving Meta connection:', result.error);
      return NextResponse.redirect(
        `${BASE_URL}/seller/platforms/meta-commerce-shop?error=${encodeURIComponent('Failed to save connection')}`
      );
    }

    console.log('[FACEBOOK-CALLBACK] Meta connection saved successfully');
    // Redirect back with success message
    return NextResponse.redirect(
      `${BASE_URL}/seller/platforms/meta-commerce-shop?success=Meta connected successfully!&autoSync=true`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OAuth callback failed';
    console.error('[FACEBOOK-CALLBACK] Error:', error);
    return NextResponse.redirect(
      `${BASE_URL}/seller/platforms/meta-commerce-shop?error=${encodeURIComponent(message)}`
    );
  }
}
