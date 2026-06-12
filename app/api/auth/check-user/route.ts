// GET /api/auth/check-user — Check if current user is seller or admin (JWT version)
import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, extractToken } from '@/lib/jwt';
import { db } from '@/lib/db';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('[CHECK-USER] Request received');
    const authHeader = request.headers.get('authorization');
    console.log('[CHECK-USER] Authorization header:', authHeader ? authHeader.substring(0, 20) + '...' : 'MISSING');
    
    const token = extractToken(request.headers);
    console.log('[CHECK-USER] Token extracted:', token ? token.substring(0, 20) + '...' : 'NONE');
    
    if (!token) {
      console.log('[CHECK-USER] No token found, returning 401');
      return NextResponse.json(
        { error: 'No authenticated user', isSeller: false, isAdmin: false, user: null },
        { status: 401 }
      );
    }

    console.log('[CHECK-USER] Verifying token...');
    const payload = await verifyJWT(token);
    console.log('[CHECK-USER] Token verified:', payload ? 'YES' : 'NO');
    
    if (!payload) {
      console.log('[CHECK-USER] Token invalid or expired, returning 401');
      return NextResponse.json(
        { error: 'Invalid or expired token', isSeller: false, isAdmin: false, user: null },
        { status: 401 }
      );
    }

    console.log('[CHECK-USER] Token payload:', { userId: payload.userId, email: payload.email });

    // Check seller by id (custom auth uses id, not user_id)
    const { data: sellerData, error: sellerError } = await db
      .from('sellers')
      .select('*')
      .eq('id', payload.userId)
      .maybeSingle();

    // Check admin by id (custom auth uses id, not user_id)
    const { data: adminData, error: adminError } = await db
      .from('admins')
      .select('id')
      .eq('id', payload.userId)
      .maybeSingle();

    console.log('[CHECK-USER] Seller found:', !!sellerData);
    console.log('[CHECK-USER] Admin found:', !!adminData);

    if (sellerError) console.error('Seller query error:', sellerError);
    if (adminError) console.error('Admin query error:', adminError);

    return NextResponse.json({
      isSeller: !!sellerData,
      isAdmin: !!adminData,
      seller: sellerData,
      user: { id: payload.userId, email: payload.email },
    });
  } catch (error) {
    console.error('[CHECK-USER] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', isSeller: false, isAdmin: false, user: null },
      { status: 500 }
    );
  }
}
