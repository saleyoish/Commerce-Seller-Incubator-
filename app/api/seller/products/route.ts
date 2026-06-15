import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/jwt';

async function authenticateRequest(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return null;
  }
  return verifyJWT(token);
}

export async function GET(request: NextRequest) {
  try {
    const decoded = await authenticateRequest(request);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const statusQuery = url.searchParams.get('status');
    const idsQuery = url.searchParams.get('ids');
    const limitParam = url.searchParams.get('limit');
    const countQuery = url.searchParams.get('count') === 'true';
    const headQuery = url.searchParams.get('head') === 'true';
    const orderParam = url.searchParams.get('order');

    const selectOptions = countQuery ? { count: 'exact', head: headQuery } : undefined;
    let query = db.from('products').select('*', selectOptions).eq('seller_id', decoded.userId);

    if (statusQuery) {
      const statuses = statusQuery.split(',').map((status) => status.trim()).filter(Boolean);
      if (statuses.length > 0) {
        query = query.in('status', statuses);
      }
    }

    if (idsQuery) {
      const ids = idsQuery.split(',').map((id) => id.trim()).filter(Boolean);
      if (ids.length > 0) {
        query = query.in('id', ids);
      }
    }

    if (orderParam) {
      const [column, direction] = orderParam.split('.');
      const ascending = direction?.toLowerCase() !== 'desc';
      query = query.order(column || 'created_at', { ascending });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    if (limitParam) {
      const limit = Number(limitParam);
      if (!Number.isNaN(limit) && limit > 0) {
        query = query.limit(limit);
      }
    }

    const { data: products, error, count } = await query;
    if (error) {
      console.error('Product list error:', error);
      return NextResponse.json({ error: error.message || 'Failed to load products' }, { status: 500 });
    }

    if (countQuery && headQuery) {
      return NextResponse.json({ count: count ?? 0 });
    }

    return NextResponse.json({ products: products || [], count: count ?? 0 });
  } catch (error: any) {
    console.error('Product list API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

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
