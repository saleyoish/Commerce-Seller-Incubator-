// GET /api/auth/check-admin — Check if current user is admin
import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, extractToken } from '@/lib/jwt';
import { db } from '@/lib/db';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const token = extractToken(request.headers);
    if (!token) {
      return NextResponse.json({ isAdmin: false }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ isAdmin: false }, { status: 401 });
    }

    const { data: admin } = await db
      .from('admins')
      .select('id')
      .eq('id', payload.userId)
      .maybeSingle();

    return NextResponse.json({ isAdmin: !!admin });
  } catch (error) {
    console.error('Error checking admin status:', error);
    return NextResponse.json({ isAdmin: false }, { status: 500 });
  }
}
