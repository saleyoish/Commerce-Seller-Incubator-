import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyJWT(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { accessToken, connectionId } = await request.json();

    if (!accessToken) {
      return NextResponse.json({ error: 'Access token is required' }, { status: 400 });
    }

    // Get seller record
    const { data: sellerData } = await db
      .from('sellers')
      .select('*')
      .eq('user_id', decoded.userId)
      .maybeSingle();

    if (!sellerData) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    const record = {
      seller_id: sellerData.id,
      platform: 'meta',
      status: 'connected',
      platform_username: null,
      platform_user_id: null,
      access_token: accessToken,
      metadata: {
        access_token: accessToken,
        last_product_sync_at: null,
      },
      connected_at: new Date().toISOString(),
    };

    let result;
    if (connectionId) {
      // Update existing connection
      result = await db
        .from('platform_connections')
        .update(record)
        .eq('id', connectionId)
        .eq('seller_id', sellerData.id)
        .select()
        .single();
    } else {
      // Insert new connection
      result = await db
        .from('platform_connections')
        .insert(record)
        .select()
        .single();
    }

    if (result.error) {
      console.error('[Seller] Error saving Meta connection:', result.error);
      return NextResponse.json({ error: 'Failed to save connection' }, { status: 500 });
    }

    return NextResponse.json({ connection: result.data });
  } catch (error: any) {
    console.error('[Seller] Meta connection API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
