import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/jwt';

// GET /api/admin/sales - Fetch all sales for admin
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyJWT(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Verify user is admin
    const { data: admin, error: adminError } = await db
      .from('admins')
      .select('id')
      .eq('id', decoded.userId)
      .maybeSingle();

    if (adminError || !admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch all sales with seller info
    const { data: sales, error: salesError } = await db
      .from('platform_sales')
      .select('*, sellers(email, name)')
      .order('sale_date', { ascending: false });

    if (salesError) {
      console.error('Sales fetch error:', salesError);
      return NextResponse.json({ error: salesError.message }, { status: 500 });
    }

    return NextResponse.json({ sales }, { status: 200 });
  } catch (error: any) {
    console.error('Admin sales API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/sales - Approve/reject sale
export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyJWT(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Verify user is admin
    const { data: admin, error: adminError } = await db
      .from('admins')
      .select('id')
      .eq('id', decoded.userId)
      .maybeSingle();

    if (adminError || !admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { saleId, status, rejectionReason } = body;

    if (!saleId || !status || !['verified', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const updateData: any = {
      verification_status: status,
      verified_at: new Date().toISOString(),
    };

    if (status === 'rejected' && rejectionReason) {
      updateData.rejection_reason = rejectionReason;
    }

    const { error: updateError } = await db
      .from('platform_sales')
      .update(updateData)
      .eq('id', saleId);

    if (updateError) {
      console.error('Sale update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Admin sale approval API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
