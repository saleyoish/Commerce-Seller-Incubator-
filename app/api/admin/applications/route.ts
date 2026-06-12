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

    // Fetch applications with waitlist data using service role client
    const { data: applications, error } = await db
      .from('applications')
      .select(`
        *,
        waitlist:waitlist_id (name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Admin] Error fetching applications:', error);
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
    }

    // Get stats
    const stats = {
      total: applications?.length || 0,
      pending: applications?.filter((a) => a.status === 'pending').length || 0,
      approved: applications?.filter((a) => a.status === 'approved').length || 0,
      rejected: applications?.filter((a) => a.status === 'rejected').length || 0,
      interview: applications?.filter((a) => a.status === 'interview').length || 0,
    };

    return NextResponse.json({ applications: applications || [], stats });
  } catch (error: any) {
    console.error('[Admin] Applications API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
