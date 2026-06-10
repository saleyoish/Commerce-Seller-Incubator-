// DELETE /api/sales/[id] — Delete a sale with JWT authentication
import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, extractToken } from '@/lib/jwt';
import { db } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
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

    // Check if sale belongs to seller
    const { data: sale } = await db
      .from('platform_sales')
      .select('seller_id')
      .eq('id', params.id)
      .maybeSingle();

    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    if (sale.seller_id !== seller.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete sale
    const { error } = await db
      .from('platform_sales')
      .delete()
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[SALES DELETE] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/sales/[id] — Update a sale with JWT authentication
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const body = await request.json();
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

    // Check if sale belongs to seller
    const { data: sale } = await db
      .from('platform_sales')
      .select('seller_id')
      .eq('id', params.id)
      .maybeSingle();

    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    if (sale.seller_id !== seller.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update sale
    const { error } = await db
      .from('platform_sales')
      .update({
        product_name: body.product_name,
        sale_amount: body.sale_amount,
        platform: body.platform,
        sale_date: body.sale_date,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[SALES PUT] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
