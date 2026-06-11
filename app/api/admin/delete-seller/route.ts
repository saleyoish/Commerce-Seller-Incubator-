import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractToken, verifyJWT } from '@/lib/jwt';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify JWT and admin privileges
    const token = extractToken(request.headers);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyJWT(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check admin by id (custom auth) or user_id (Supabase auth)
    const { data: admin } = await db
      .from('admins')
      .select('id')
      .or(`id.eq.${payload.userId},user_id.eq.${payload.userId}`)
      .maybeSingle();
    if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    // Parse request body
    const body = await request.json();
    const { sellerId } = body;

    if (!sellerId) {
      return NextResponse.json({ error: 'Seller ID required' }, { status: 400 });
    }

    // Get seller details before deletion for logging
    const { data: seller } = await db.from('sellers').select('email, user_id').eq('id', sellerId).maybeSingle();

    if (!seller) return NextResponse.json({ error: 'Seller not found' }, { status: 404 });

    // Delete seller's data from all related tables (DB-only). Do not attempt to delete auth user.
    const deletionPromises = [
      db.from('stream_sessions').delete().eq('seller_id', sellerId),
      db.from('products').delete().eq('seller_id', sellerId),
      db.from('platform_connections').delete().eq('seller_id', sellerId),
      db.from('tiktok_shop_connections').delete().eq('seller_id', sellerId),
      db.from('referrals').delete().eq('referrer_id', seller.user_id),
      db.from('sales').delete().eq('seller_id', sellerId),
      db.from('sellers').delete().eq('id', sellerId),
    ];

    for (const p of deletionPromises) {
      await p;
    }

    console.log(`Seller deleted: ${seller.email} (ID: ${sellerId}) by admin: ${payload.email}`);

    return NextResponse.json({
      success: true,
      message: `Seller ${seller.email} and all associated data have been permanently deleted`
    });

  } catch (error: any) {
    console.error('Error deleting seller:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete seller' },
      { status: 500 }
    );
  }
}
