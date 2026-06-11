import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractToken, verifyJWT } from '@/lib/jwt';

export async function PUT(request: NextRequest) {
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

    const { sellerId, ...updates } = await request.json();

    if (!sellerId) {
      return NextResponse.json({ error: 'Seller ID is required' }, { status: 400 });
    }

    // Update seller
    const { error } = await db
      .from('sellers')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sellerId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Seller updated successfully' });
  } catch (error: any) {
    console.error('Update seller error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update seller' },
      { status: 500 }
    );
  }
}
