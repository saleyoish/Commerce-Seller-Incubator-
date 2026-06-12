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

    const { data, error } = await db
      .from('platform_connections')
      .select('*')
      .eq('seller_id', payload.userId);

    if (error) {
      console.error('[SELLER PLATFORM CONNECTIONS] DB error:', error);
      return NextResponse.json({ error: 'Failed to load connections' }, { status: 500 });
    }

    return NextResponse.json({ connections: data });
  } catch (err: any) {
    console.error('[SELLER PLATFORM CONNECTIONS] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
