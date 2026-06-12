import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/jwt';

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
    const { data: admin } = await db
      .from('admins')
      .select('id')
      .eq('id', decoded.userId)
      .maybeSingle();

    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all TikTok connections using service role client
    const { data: connections, error: connError } = await db
      .from('tiktok_shop_connections')
      .select(`
        *,
        seller:seller_id (email)
      `)
      .order('created_at', { ascending: false });

    if (connError) {
      console.error('[Admin] Error fetching TikTok connections:', connError);
    }

    // Get stats
    const { data: tiktokProducts } = await db
      .from('tiktok_products')
      .select('sync_status');

    const { data: tiktokOrders } = await db
      .from('tiktok_orders')
      .select('order_status');

    const { data: recentSyncs } = await db
      .from('tiktok_sync_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    const stats = {
      totalConnections: connections?.length || 0,
      activeConnections: connections?.filter((c) => c.is_connected).length || 0,
      totalProducts: tiktokProducts?.length || 0,
      syncedProducts: tiktokProducts?.filter((p) => p.sync_status === 'synced').length || 0,
      totalOrders: tiktokOrders?.length || 0,
      pendingOrders: tiktokOrders?.filter(
        (o) => o.order_status === 'unpaid' || o.order_status === 'awaiting_shipment'
      ).length || 0,
    };

    return NextResponse.json({
      connections: connections || [],
      stats,
      recentSyncs: recentSyncs || [],
    });
  } catch (error: any) {
    console.error('[Admin] TikTok API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
