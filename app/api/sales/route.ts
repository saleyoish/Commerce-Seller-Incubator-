// GET /api/sales — Get seller's sales with JWT authentication
import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, extractToken } from '@/lib/jwt';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const token = extractToken(request.headers, request.cookies);
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Get seller data
    const { data: seller } = await db
      .from('sellers')
      .select('id')
      .eq('id', payload.userId)
      .maybeSingle();

    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    // Get platform sales
    const { data: sales, error } = await db
      .from('platform_sales')
      .select('*')
      .eq('seller_id', seller.id)
      .order('sale_date', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ sales: sales || [] });
  } catch (err) {
    console.error('[SALES GET] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
