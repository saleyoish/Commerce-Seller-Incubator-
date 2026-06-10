import { NextRequest, NextResponse } from 'next/server';
import { createServerSideSupabase } from '@/lib/supabase-server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createServerSideSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get seller data
    const { data: sellers, error: sellerError } = await supabase
      .from('sellers')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (sellerError || !sellers || sellers.length === 0) {
      return NextResponse.json({ streams: [] });
    }

    // Get all stream sessions for this seller
    const { data: streams, error: streamsError } = await supabase
      .from('stream_sessions')
      .select('*')
      .eq('seller_id', sellers[0].id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (streamsError) {
      console.error('Error fetching streams:', streamsError);
      return NextResponse.json({ error: 'Failed to fetch streams' }, { status: 500 });
    }

    return NextResponse.json({ streams: streams || [] });

  } catch (error: any) {
    console.error('Streams API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
