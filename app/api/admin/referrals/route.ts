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

    // Fetch all referrals with seller info using service role client
    console.log('[Admin] Fetching all referrals...');
    const { data: referrals, error } = await db
      .from('referrals')
      .select(`
        *,
        referrer:referrer_id (email, referral_code)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Admin] Error fetching referrals:', error);
      return NextResponse.json({ error: 'Failed to fetch referrals: ' + error.message }, { status: 500 });
    }

    console.log('[Admin] Referrals fetched:', referrals?.length || 0, 'records');
    console.log('[Admin] First few referrals:', referrals?.slice(0, 3));

    // Get top referrers using service role client
    const { data: topReferrers } = await db.rpc('get_top_referrers', {
      limit_count: 10,
    });

    // Get stats
    const stats = {
      total: referrals?.length || 0,
      approved: referrals?.filter((r: any) => r.status === 'approved').length || 0,
      active: referrals?.filter((r: any) => r.status === 'active').length || 0,
      paid: referrals?.filter((r: any) => r.paid).length || 0,
      pendingPayout:
        referrals?.filter((r: any) => !r.paid && (r.status === 'active' || r.status === 'approved')).length || 0,
      totalPaid:
        referrals
          ?.filter((r: any) => r.paid)
          .reduce((sum: number, r: any) => sum + (r.bonus_amount || 0), 0) || 0,
      totalPending:
        referrals
          ?.filter((r: any) => !r.paid && (r.status === 'active' || r.status === 'approved'))
          .reduce((sum: number, r: any) => sum + (r.bonus_amount || 0), 0) || 0,
    };

    console.log('[Admin] Returning stats:', stats);
    return NextResponse.json({ referrals: referrals || [], stats, topReferrers: topReferrers || [] });
  } catch (error: any) {
    console.error('[Admin] Referrals API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
