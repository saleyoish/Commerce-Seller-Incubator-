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
    const selectQuery = url.searchParams.get('select') || '*';
    const limitParam = url.searchParams.get('limit');
    const countQuery = url.searchParams.get('count') === 'true';
    const headQuery = url.searchParams.get('head') === 'true';
    const orderParam = url.searchParams.get('order');

    const selectOptions = countQuery ? { count: 'exact', head: headQuery } : undefined;
    let query = db.from('sales').select(selectQuery, selectOptions).eq('seller_id', decoded.userId);

    if (statusQuery) {
      const statuses = statusQuery.split(',').map((status) => status.trim()).filter(Boolean);
      if (statuses.length > 0) {
        query = query.in('status', statuses);
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

    const { data: sales, error, count } = await query;
    if (error) {
      console.error('Sales list error:', error);
      return NextResponse.json({ error: error.message || 'Failed to load sales' }, { status: 500 });
    }

    if (countQuery && headQuery) {
      return NextResponse.json({ count: count ?? 0 });
    }

    return NextResponse.json({ sales: sales || [], count: count ?? 0 });
  } catch (error: any) {
    console.error('Sales list API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyJWT(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      seller_id,
      platform,
      product_id,
      product_name,
      sale_amount,
      platform_fee,
      our_commission,
      seller_payout,
      sale_date,
      buyer_info,
      entry_type,
      verification_status,
      notes
    } = body;

    // Validate required fields
    if (!seller_id || !platform || !sale_amount || !sale_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify the seller belongs to the user
    const { data: seller, error: sellerError } = await db
      .from('sellers')
      .select('id')
      .eq('id', seller_id)
      .eq('id', decoded.userId)
      .maybeSingle();

    if (sellerError) {
      console.error('Seller verification error:', sellerError);
      return NextResponse.json({ error: 'Database error during seller verification' }, { status: 500 });
    }

    if (!seller) {
      console.error('Seller not found or unauthorized:', { seller_id, userId: decoded.userId });
      return NextResponse.json({ error: 'Seller not found or unauthorized' }, { status: 403 });
    }

    // Create sale
    const { data: sale, error: saleError } = await db
      .from('platform_sales')
      .insert({
        seller_id,
        platform,
        product_id: product_id || null,
        product_name: product_name || null,
        sale_amount: parseFloat(sale_amount),
        platform_fee: parseFloat(platform_fee),
        our_commission: parseFloat(our_commission),
        seller_payout: parseFloat(seller_payout) || Math.max(0, parseFloat(sale_amount) - parseFloat(platform_fee) - parseFloat(our_commission)),
        sale_date,
        buyer_info: buyer_info || {},
        entry_type: entry_type || 'manual',
        verification_status: verification_status || 'pending',
        notes: notes || null,
      })
      .select()
      .single();

    if (saleError) {
      console.error('Sale creation error:', saleError);
      return NextResponse.json({ error: saleError.message }, { status: 500 });
    }

    return NextResponse.json({ sale }, { status: 201 });
  } catch (error: any) {
    console.error('Sale creation API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
