import { NextRequest, NextResponse } from 'next/server';
import { createServerSideSupabase } from '@/lib/supabase-server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createServerSideSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { streamKey, restreamUsername } = await request.json();

    if (!streamKey || typeof streamKey !== 'string' || streamKey.trim().length === 0) {
      return NextResponse.json(
        { error: 'Stream key is required' },
        { status: 400 }
      );
    }

    // Validate stream key format (Restream keys typically start with 're_')
    const trimmedKey = streamKey.trim();
    if (!trimmedKey.startsWith('re_') && !trimmedKey.startsWith('rtmp://')) {
      // Allow but warn - could be a different format
      console.warn('Stream key does not match expected Restream format:', trimmedKey.substring(0, 10) + '...');
    }

    // Use provided username or generate from user info
    const username = restreamUsername || user.email?.split('@')[0] || 'restream_user';

    // First check if seller exists by user_id; fallback to email if needed
    let existingSellers = null;
    let existingSeller = null;

    const { data: sellersById } = await supabase
      .from('sellers')
      .select('id, restream_stream_key')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    existingSellers = sellersById;

    if ((!existingSellers || existingSellers.length === 0) && user.email) {
      const { data: sellersByEmail } = await supabase
        .from('sellers')
        .select('id, restream_stream_key')
        .eq('email', user.email)
        .order('created_at', { ascending: false });
      existingSellers = sellersByEmail;
    }

    if (existingSellers && existingSellers.length > 0) {
      existingSeller = existingSellers.find(s => s.restream_stream_key && 
                                               s.restream_stream_key !== 'NOT_CONFIGURED' && 
                                               s.restream_stream_key.length > 10);
      if (!existingSeller) {
        existingSeller = existingSellers[0];
      }
    }

    let seller;
    let updateError;

    if (!existingSeller) {
      // Auto-create seller record if it doesn't exist
      const { data: newSellers, error: createError } = await supabase
        .from('sellers')
        .insert({
          user_id: user.id,
          email: user.email || '',
          phone: '',
          stripe_onboarding_status: 'pending',
          approval_status: 'pending',
          restream_stream_key: trimmedKey,
          restream_username: username
        })
        .select();
      
      seller = newSellers && newSellers.length > 0 ? newSellers[0] : null;
      updateError = createError;
    } else {
      // Update the most recent seller record
      const { data: updatedSellers, error } = await supabase
        .from('sellers')
        .update({
          restream_stream_key: trimmedKey,
          restream_username: username,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSeller.id)
        .select();
      
      seller = updatedSellers && updatedSellers.length > 0 ? updatedSellers[0] : null;
      updateError = error;
    }

    if (updateError) {
      console.error('Failed to update Restream key:', updateError);
      return NextResponse.json(
        { error: 'Failed to save stream key. Please try again.' },
        { status: 500 }
      );
    }

    if (!seller) {
      return NextResponse.json(
        { error: 'Failed to save stream key. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Restream stream key saved successfully',
      connected: true
    });

  } catch (error: any) {
    console.error('Update Restream key error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save Restream key' },
      { status: 500 }
    );
  }
}
