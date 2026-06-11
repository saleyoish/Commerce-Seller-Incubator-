import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/jwt';

// PUT /api/seller/products/[id] - Update product
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyJWT(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, price, stock_quantity, category, sku, status } = body;

    // Verify the product belongs to the seller
    const { data: product, error: productError } = await db
      .from('products')
      .select('seller_id')
      .eq('id', params.id)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Verify the seller belongs to the user
    const { data: seller, error: sellerError } = await db
      .from('sellers')
      .select('id')
      .eq('id', product.seller_id)
      .eq('id', decoded.userId)
      .single();

    if (sellerError || !seller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update product
    const { data: updatedProduct, error: updateError } = await db
      .from('products')
      .update({
        ...(name && { name }),
        ...(description !== undefined && { description: description || null }),
        ...(price && { price: parseFloat(price) }),
        ...(stock_quantity !== undefined && { stock_quantity: parseInt(stock_quantity) }),
        ...(category && { category }),
        ...(sku !== undefined && { sku: sku || null }),
        ...(status && { status }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      console.error('Product update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ product: updatedProduct }, { status: 200 });
  } catch (error: any) {
    console.error('Product update API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/seller/products/[id] - Delete product
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyJWT(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Verify the product belongs to the seller
    const { data: product, error: productError } = await db
      .from('products')
      .select('seller_id')
      .eq('id', params.id)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Verify the seller belongs to the user
    const { data: seller, error: sellerError } = await db
      .from('sellers')
      .select('id')
      .eq('id', product.seller_id)
      .eq('id', decoded.userId)
      .single();

    if (sellerError || !seller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete product
    const { error: deleteError } = await db
      .from('products')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      console.error('Product delete error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Product delete API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
