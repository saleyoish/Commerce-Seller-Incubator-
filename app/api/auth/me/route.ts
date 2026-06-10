// GET /api/auth/me — Get current authenticated user
import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, extractToken } from '@/lib/jwt';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const token = extractToken(request.headers);
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

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

    if (!seller && !admin) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: payload.userId,
      email: payload.email,
      isSeller: !!seller,
      isAdmin: !!admin,
      seller: seller ?? null,
      approval_status: seller?.approval_status ?? null,
      is_temp_password: seller?.is_temp_password ?? false,
    });
  } catch (err) {
    console.error('[ME] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
