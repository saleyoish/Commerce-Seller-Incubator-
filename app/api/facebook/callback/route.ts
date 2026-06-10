import { exchangeShortLivedToken } from '@/lib/meta-service';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const META_APP_ID = process.env.META_APP_ID || '';
const META_APP_SECRET = process.env.META_APP_SECRET || '';
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL;
const REDIRECT_URI = BASE_URL + '/api/facebook/callback';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      return NextResponse.redirect(
        `${BASE_URL}/seller/platforms/meta-commerce-shop?error=${encodeURIComponent(errorDescription || error)}`
      );
    }

    if (!code) {
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
      console.error('Token exchange error:', tokenData);
      return NextResponse.redirect(
        `${BASE_URL}/seller/platforms/facebook?error=${encodeURIComponent(errorMsg)}`
      );
    }

    // Exchange short-lived token for long-lived token
    let longLivedToken = tokenData.access_token;
    try {
      const exchanged = await exchangeShortLivedToken(META_APP_ID, META_APP_SECRET, tokenData.access_token);
      longLivedToken = exchanged.access_token;
    } catch (exchangeError) {
      console.warn('Could not exchange for long-lived token, using short-lived:', exchangeError);
      // Continue with short-lived token if exchange fails
    }

    // Get authenticated user from session
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const cookieStore = await cookies();
    
    const supabase = createServerClient(supabaseUrl!, supabasePublishableKey!, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    });
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.redirect(`${BASE_URL}/login?error=Authentication required`);
    }

    // Get seller record using admin client (bypasses RLS)
    const adminSupabase = createAdminSupabase();
    const { data: sellerData } = await adminSupabase
      .from('sellers')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!sellerData) {
      return NextResponse.redirect(`${BASE_URL}/signup?error=Seller account not found`);
    }

    // Get Facebook user info
    const userUrl = new URL('https://graph.facebook.com/v19.0/me');
    userUrl.searchParams.set('access_token', longLivedToken);
    userUrl.searchParams.set('fields', 'id,name');

    const userResponse = await fetch(userUrl.toString());
    const userData = await userResponse.json();

    const facebookUserId = userData.id || null;
    const facebookUserName = userData.name || null;

    // Check if connection already exists (check both meta and facebook for migration)
    const { data: existingMetaConnection } = await adminSupabase
      .from('platform_connections')
      .select('*')
      .eq('seller_id', sellerData.id)
      .eq('platform', 'meta')
      .maybeSingle();

    const { data: existingFacebookConnection } = await adminSupabase
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
      result = await adminSupabase
        .from('platform_connections')
        .update(connectionRecord)
        .eq('id', existingMetaConnection.id)
        .select()
        .single();
    } else if (existingFacebookConnection) {
      // Migrate facebook connection to meta
      await adminSupabase
        .from('platform_connections')
        .delete()
        .eq('id', existingFacebookConnection.id);
      result = await adminSupabase
        .from('platform_connections')
        .insert(connectionRecord)
        .select()
        .single();
    } else {
      result = await adminSupabase
        .from('platform_connections')
        .insert(connectionRecord)
        .select()
        .single();
    }

    if (result.error) {
      console.error('Error saving Meta connection:', result.error);
      return NextResponse.redirect(
        `${BASE_URL}/seller/platforms/meta-commerce-shop?error=${encodeURIComponent('Failed to save connection')}`
      );
    }

    // Redirect back with success message
    return NextResponse.redirect(
      `${BASE_URL}/seller/platforms/meta-commerce-shop?success=Meta connected successfully!&autoSync=true`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OAuth callback failed';
    console.error('Facebook OAuth callback error:', error);
    return NextResponse.redirect(
      `${BASE_URL}/seller/platforms/meta-commerce-shop?error=${encodeURIComponent(message)}`
    );
  }
}
