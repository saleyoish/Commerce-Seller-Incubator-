import { NextRequest, NextResponse } from 'next/server';
import { createServerSideSupabase } from '@/lib/supabase-server';
import { streamingService } from '@/services/streaming.service';
import { validateCreateStreamRequest, validateEnvironment } from '@/lib/validation/streaming-new';
import { StreamType, StreamStatus } from '@/types/streaming';
import { STREAMING_CONSTANTS } from '@/constants/streaming';
import { rateLimiter } from '@/lib/rate-limiter';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Validate environment variables
    validateEnvironment();

    // Rate limiting
    const ip = rateLimiter.getClientIP(request);
    const rateLimitResult = await rateLimiter.check(ip, 'instant-live', 5, 60); // 5 requests per minute
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Get current user
    const supabase = await createServerSideSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get seller data
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('*, restream_username, restream_stream_key')
      .eq('user_id', user.id)
      .single();

    if (sellerError || !seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const { platforms, title, selectedProducts } = validateCreateStreamRequest(body);

    // Check seller approval status
    if (seller.approval_status !== 'approved') {
      return NextResponse.json(
        { error: 'Account must be approved to start streaming' },
        { status: 403 }
      );
    }

    // Create stream session using service layer
    const result = await streamingService.createStreamSession(seller.id, {
      title,
      platforms,
      selectedProducts,
      type: StreamType.INSTANT
    });

    // Log the stream creation
    console.log(`Stream session created: ${result.streamSession.id} for seller: ${seller.id}`);

    return NextResponse.json({
      success: true,
      streamSession: result.streamSession,
      obsConfig: result.obsConfig,
      platforms: result.platforms,
      warning: result.warning,
      nextSteps: {
        1: 'Open OBS with provided configuration',
        2: 'Click "Start Streaming" in OBS',
        3: 'Stream will go live automatically when detected',
        4: 'Dashboard will update in real-time'
      }
    });

  } catch (error: any) {
    console.error('Instant live API error:', error);
    
    // Handle specific error types
    if (error.message.includes('already have')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    if (error.message.includes('Validation failed')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check current stream status
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get current user
    const supabase = await createServerSideSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get seller data
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (sellerError || !seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 403 });
    }

    // Get active stream
    const activeStream = await streamingService.getActiveStream(seller.id);

    return NextResponse.json({
      success: true,
      activeStream,
      canStartNewStream: !activeStream
    });

  } catch (error: any) {
    console.error('Stream status check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to end current stream
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    // Get current user
    const supabase = await createServerSideSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get seller data
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (sellerError || !seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 403 });
    }

    // Get active stream
    const activeStream = await streamingService.getActiveStream(seller.id);

    if (!activeStream) {
      return NextResponse.json(
        { error: 'No active stream found' },
        { status: 404 }
      );
    }

    // End the stream
    await streamingService.endStream(activeStream.id, 'User requested');

    return NextResponse.json({
      success: true,
      message: 'Stream ended successfully'
    });

  } catch (error: any) {
    console.error('Stream end error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
