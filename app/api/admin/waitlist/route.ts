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

    // Fetch only approved sellers from sellers table
    const { data: waitlist, error } = await db
      .from('sellers')
      .select('*')
      .eq('approval_status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Admin] Error fetching waitlist:', error);
      return NextResponse.json({ error: 'Failed to fetch waitlist: ' + error.message }, { status: 500 });
    }

    // Get stats for approved sellers only
    const stats = {
      total: waitlist?.length || 0,
      activeStripe: waitlist?.filter((w) => w.stripe_onboarding_status === 'active').length || 0,
    };

    return NextResponse.json({ waitlist: waitlist || [], stats });
  } catch (error: any) {
    console.error('[Admin] Waitlist API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
