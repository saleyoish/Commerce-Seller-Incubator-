// GET /api/auth/me — Get current authenticated user
import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, extractToken } from '@/lib/jwt';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    console.log('[ME] Request received');
    const authHeader = request.headers.get('authorization');
    console.log('[ME] Authorization header:', authHeader ? authHeader.substring(0, 20) + '...' : 'MISSING');
    
    const token = extractToken(request.headers);
    console.log('[ME] Token extracted:', token ? token.substring(0, 20) + '...' : 'NONE');
    
    if (!token) {
      console.log('[ME] No token found, returning 401');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('[ME] Verifying token...');
    const payload = await verifyJWT(token);
    console.log('[ME] Token verified:', payload ? 'YES' : 'NO');
    
    if (!payload) {
      console.log('[ME] Token invalid or expired, returning 401');
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    console.log('[ME] Token payload:', { userId: payload.userId, email: payload.email });

    // Check seller by id (custom auth uses id, not user_id)
    const { data: seller } = await db
      .from('sellers')
      .select('id, user_id, email, approval_status, is_temp_password, created_at')
      .eq('id', payload.userId)
      .maybeSingle();

    // Check admin by id (custom auth uses id, not user_id)
    const { data: admin } = await db
      .from('admins')
      .select('id, user_id, email')
      .eq('id', payload.userId)
      .maybeSingle();

    console.log('[ME] Seller found:', !!seller);
    console.log('[ME] Admin found:', !!admin);

    if (!seller && !admin) {
      console.log('[ME] User not found in database, returning 404');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const response = {
      id: payload.userId,
      email: payload.email,
      isSeller: !!seller,
      isAdmin: !!admin,
      seller: seller ?? null,
      approval_status: seller?.approval_status ?? null,
      is_temp_password: seller?.is_temp_password ?? false,
    };
    
    console.log('[ME] Returning user data');
    return NextResponse.json(response);
  } catch (err) {
    console.error('[ME] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
