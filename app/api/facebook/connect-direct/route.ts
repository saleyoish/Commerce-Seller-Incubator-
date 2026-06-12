// POST /api/facebook/connect-direct — Direct token connection (bypass OAuth)
import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, extractToken } from '@/lib/jwt';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    console.log('[FACEBOOK-DIRECT] Direct token connection request received');
    
    // Get JWT token from headers
    const token = extractToken(request.headers);
    
    if (!token) {
      console.log('[FACEBOOK-DIRECT] No JWT token found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('[FACEBOOK-DIRECT] Verifying JWT token');
    const payload = await verifyJWT(token);
    
    if (!payload) {
      console.log('[FACEBOOK-DIRECT] Invalid JWT token');
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    console.log('[FACEBOOK-DIRECT] JWT token verified, userId:', payload.userId);

    // Get Meta access token from request body
    const body = await request.json();
    const accessToken = body.accessToken;
    
    if (!accessToken) {
      console.log('[FACEBOOK-DIRECT] No access token provided');
      return NextResponse.json(
        { error: 'Meta access token is required' },
        { status: 400 }
      );
    }

    console.log('[FACEBOOK-DIRECT] Access token provided, validating with Meta API');

    // Validate token with Meta API
    const validateUrl = new URL('https://graph.facebook.com/v19.0/me');
    validateUrl.searchParams.set('access_token', accessToken);
    validateUrl.searchParams.set('fields', 'id,name');

    const validateResponse = await fetch(validateUrl.toString());
    const userData = await validateResponse.json();

    if (!validateResponse.ok || userData.error) {
      console.error('[FACEBOOK-DIRECT] Token validation failed:', userData.error);
      return NextResponse.json(
        { error: 'Invalid Meta access token' },
        { status: 400 }
      );
    }

    const facebookUserId = userData.id || null;
    const facebookUserName = userData.name || null;

    console.log('[FACEBOOK-DIRECT] Token validated, user:', facebookUserName);

    // Get seller record
    const { data: sellerData } = await db
      .from('sellers')
      .select('*')
      .eq('id', payload.userId)
      .maybeSingle();

    if (!sellerData) {
      console.log('[FACEBOOK-DIRECT] Seller not found');
      return NextResponse.json(
        { error: 'Seller account not found' },
        { status: 404 }
      );
    }

    console.log('[FACEBOOK-DIRECT] Seller found:', sellerData.email, 'seller.id:', sellerData.id);

    // Check if connection already exists
    const { data: existingConnection } = await db
      .from('platform_connections')
      .select('*')
      .eq('seller_id', sellerData.id)
      .eq('platform', 'meta')
      .maybeSingle();

    console.log('[FACEBOOK-DIRECT] Existing connection:', !!existingConnection);

    const connectionRecord = {
      seller_id: sellerData.id,
      platform: 'meta',
      status: 'connected',
      platform_username: facebookUserName,
      platform_user_id: facebookUserId,
      access_token: accessToken,
      metadata: {
        access_token: accessToken,
        pageName: facebookUserName,
        last_product_sync_at: existingConnection?.metadata?.last_product_sync_at || null,
      },
      connected_at: new Date().toISOString(),
    };

    console.log('[FACEBOOK-DIRECT] Connection record seller_id:', connectionRecord.seller_id);

    let result;
    if (existingConnection) {
      console.log('[FACEBOOK-DIRECT] Updating existing connection');
      result = await db
        .from('platform_connections')
        .update(connectionRecord)
        .eq('id', existingConnection.id)
        .select('*')
        .single();
    } else {
      console.log('[FACEBOOK-DIRECT] Creating new connection');
      result = await db
        .from('platform_connections')
        .insert(connectionRecord)
        .select('*')
        .single();
    }

    if (result.error) {
      console.error('[FACEBOOK-DIRECT] Error saving connection:', result.error);
      return NextResponse.json(
        { error: 'Failed to save connection' },
        { status: 500 }
      );
    }

    console.log('[FACEBOOK-DIRECT] Connection saved successfully');
    console.log('[FACEBOOK-DIRECT] Result data:', result.data);
    console.log('[FACEBOOK-DIRECT] Result error:', result.error);
    console.log('[FACEBOOK-DIRECT] Full result:', result);
    
    if (!result.data) {
      console.error('[FACEBOOK-DIRECT] No data in result after save');
      return NextResponse.json(
        { error: 'Connection saved but no data returned' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Meta connected successfully',
      connection: result.data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Direct connection failed';
    console.error('[FACEBOOK-DIRECT] Error:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
