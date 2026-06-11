// GET /api/sales — Get seller's sales with JWT authentication
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

    // Calculate seller_payout for sales that don't have it
    const salesWithPayout = (sales || []).map((sale: any) => {
      if (!sale.seller_payout && sale.sale_amount) {
        const platformFee = sale.platform_fee || (sale.sale_amount * 0.05);
        const ourCommission = sale.our_commission || ((sale.sale_amount - platformFee) * 0.15);
        sale.seller_payout = sale.sale_amount - platformFee - ourCommission;
      }
      return sale;
    });

    return NextResponse.json({ sales: salesWithPayout || [] });
  } catch (err) {
    console.error('[SALES GET] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
