import { NextRequest, NextResponse } from 'next/server';
import { createServerSideSupabase } from '@/lib/supabase-server';
import { sendSellerApprovalNotification } from '@/lib/resend';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSideSupabase();
    
    // Check if user is admin
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: admin } = await supabase
      .from('admins')
      .select('id')
      .eq('user_id', session.user.id)
      .single();

    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { sellerId, approve } = await request.json();

    if (!sellerId) {
      return NextResponse.json({ error: 'Seller ID is required' }, { status: 400 });
    }

    // Get seller info
    const { data: seller } = await supabase
      .from('sellers')
      .select('*')
      .eq('id', sellerId)
      .single();

    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    // Update seller status
    const { error: updateError } = await supabase
      .from('sellers')
      .update({ approval_status: approve ? 'approved' : 'rejected' })
      .eq('id', sellerId);

    if (updateError) {
      throw updateError;
    }

    // Send notification email
    await sendSellerApprovalNotification(
      seller.email,
      seller.email, // Using email as name
      approve
    );

    return NextResponse.json({ 
      success: true, 
      message: `Seller ${approve ? 'approved' : 'rejected'} successfully` 
    });
  } catch (error: any) {
    console.error('Approve seller error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update seller status' },
      { status: 500 }
    );
  }
}
