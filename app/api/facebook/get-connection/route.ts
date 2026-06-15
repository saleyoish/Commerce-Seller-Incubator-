// GET /api/facebook/get-connection — Get current Meta connection (JWT auth)
import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, extractToken } from '@/lib/jwt';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    console.log('[GET-CONNECTION] Request received');
    
    // Get JWT token from headers
    const token = extractToken(request.headers);
    
    if (!token) {
      console.log('[GET-CONNECTION] No JWT token found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('[GET-CONNECTION] Verifying JWT token');
    const payload = await verifyJWT(token);
    
    if (!payload) {
      console.log('[GET-CONNECTION] Invalid JWT token');
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    console.log('[GET-CONNECTION] JWT token verified, userId:', payload.userId);

    // Get seller record
    const { data: sellerData } = await db
      .from('sellers')
      .select('*')
      .eq('id', payload.userId)
      .maybeSingle();

    if (!sellerData) {
      console.log('[GET-CONNECTION] Seller not found');
      return NextResponse.json(
        { error: 'Seller account not found' },
        { status: 404 }
      );
    }

    console.log('[GET-CONNECTION] Seller found:', sellerData.email, 'seller.id:', sellerData.id);

    // Get Meta connection (only return if connected)
    const { data: connection, error: connError } = await db
      .from('platform_connections')
      .select('*')
      .eq('seller_id', sellerData.id)
      .eq('platform', 'meta')
      .eq('status', 'connected')
      .maybeSingle();

    console.log('[GET-CONNECTION] Connection query result:', { 
      connection: connection ? 'found' : 'not found', 
      connError,
      seller_id: sellerData.id 
    });

    return NextResponse.json({
      connection: connection || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get connection';
    console.error('[GET-CONNECTION] Error:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
