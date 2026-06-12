import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/jwt';

const modules = [
  "getting-started",
  "tiktok-setup",
  "obs-setup",
  "best-practices",
  "product-upload",
  "going-live",
  "commissions",
  "faq",
];

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

    // Fetch all sellers with their training progress using service role client
    const { data: sellers, error: sellersError } = await db
      .from('sellers')
      .select('id, email, created_at')
      .order('created_at', { ascending: false });

    if (sellersError) {
      console.error('[Admin] Error fetching sellers:', sellersError);
      return NextResponse.json({ error: 'Failed to fetch sellers' }, { status: 500 });
    }

    // Fetch all training progress
    const { data: progress, error: progressError } = await db
      .from('training_progress')
      .select('*')
      .eq('completed', true);

    if (progressError) {
      console.error('[Admin] Error fetching progress:', progressError);
    }

    // Calculate seller progress
    const sellerProgress = sellers.map((seller) => {
      const completed =
        progress?.filter((p) => p.seller_id === seller.id).length || 0;
      return {
        ...seller,
        completed,
        percentage: Math.round((completed / modules.length) * 100),
      };
    });

    // Calculate stats
    const stats = {
      totalSellers: sellers.length,
      completedTraining: sellerProgress.filter((s) => s.percentage === 100).length,
      inProgress: sellerProgress.filter(
        (s) => s.percentage > 0 && s.percentage < 100
      ).length,
      notStarted: sellerProgress.filter((s) => s.percentage === 0).length,
      averageProgress:
        sellerProgress.length > 0
          ? Math.round(
              sellerProgress.reduce((sum, s) => sum + s.percentage, 0) /
                sellerProgress.length
            )
          : 0,
    };

    // Get module completion stats
    const moduleStats = modules.map((moduleId) => {
      const completed =
        progress?.filter((p) => p.module_id === moduleId).length || 0;
      return {
        id: moduleId,
        completed,
        percentage:
          sellers.length > 0 ? Math.round((completed / sellers.length) * 100) : 0,
      };
    });

    return NextResponse.json({
      sellerProgress,
      stats,
      moduleStats,
    });
  } catch (error: any) {
    console.error('[Admin] Training API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
