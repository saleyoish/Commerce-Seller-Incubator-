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
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { data: seller, error } = await db
      .from('sellers')
      .select('*')
      .eq('id', payload.userId)
      .maybeSingle();

    if (error) {
      console.error('[SELLER ME] DB error:', error);
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }

    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    return NextResponse.json({ seller });
  } catch (err: any) {
    console.error('[SELLER ME] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
