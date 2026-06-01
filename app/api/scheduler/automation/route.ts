import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { 
  createRecurringSchedule, 
  processDueReminders, 
  autoStartDueStreams, 
  cancelMissedStreams,
  getSellerUpcomingStreams
} from '@/lib/services/stream-scheduler';

// POST - Create recurring schedule
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await request.json();

    // Validate required fields
    if (!config.sellerId || !config.title || !config.startDate || !config.startTime) {
      return NextResponse.json(
        { error: 'Missing required fields: sellerId, title, startDate, startTime' },
        { status: 400 }
      );
    }

    // Verify seller ownership
    const { data: seller } = await supabase
      .from('sellers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!seller || seller.id !== config.sellerId) {
      return NextResponse.json({ error: 'Unauthorized access to seller' }, { status: 403 });
    }

    // Create recurring schedule
    const sessions = await createRecurringSchedule(config);

    return NextResponse.json({
      success: true,
      sessions,
      count: sessions.length,
    });

  } catch (error: any) {
    console.error('Scheduler automation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Process automation tasks (reminders, auto-start, cancel missed)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (!action) {
      return NextResponse.json({ error: 'Action parameter required' }, { status: 400 });
    }

    let result;

    switch (action) {
      case 'process-reminders':
        result = await processDueReminders();
        break;
      case 'auto-start':
        result = await autoStartDueStreams();
        break;
      case 'cancel-missed':
        result = await cancelMissedStreams();
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      action,
      result,
      count: result.length,
    });

  } catch (error: any) {
    console.error('Scheduler automation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
