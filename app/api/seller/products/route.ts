import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    // Verify JWT token
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyJWT(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { seller_id, name, description, price, category, stock_quantity, sku, status } = body;

    // Validate required fields
    if (!seller_id || !name || !price || !category || stock_quantity === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify the seller belongs to the user (JWT contains seller.id as userId)
    const { data: seller, error: sellerError } = await db
      .from('sellers')
      .select('id, user_id')
      .eq('id', seller_id)
      .eq('id', decoded.userId)
      .single();

    if (sellerError || !seller) {
      return NextResponse.json({ error: 'Seller not found or unauthorized' }, { status: 403 });
    }

    // Create product
    const { data: product, error: productError } = await db
      .from('products')
      .insert({
        seller_id,
        name,
        description: description || null,
        price: parseFloat(price),
        category,
        stock_quantity: parseInt(stock_quantity),
        sku: sku || null,
        status: status || 'active',
      })
      .select()
      .single();

    if (productError) {
      console.error('Product creation error:', productError);
      return NextResponse.json({ error: productError.message }, { status: 500 });
    }

    return NextResponse.json({ product }, { status: 201 });
  } catch (error: any) {
    console.error('Product API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
