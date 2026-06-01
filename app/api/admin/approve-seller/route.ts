import { NextRequest, NextResponse } from 'next/server';
import { createServerSideSupabase } from '@/lib/supabase-server';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { generatePassword, sendApprovalEmailToSeller, sendReferralApprovalEmailToSeller } from '@/lib/gmail';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSideSupabase();
    const adminSupabase = createAdminSupabase(); // For auth admin operations
    
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

    // If approving, generate password and send credentials email
    if (approve) {
      try {
        // Generate new password
        const password = generatePassword();
        
        // Update user password in auth
        const { data: sellerUser } = await supabase
          .from('sellers')
          .select('user_id')
          .eq('id', sellerId)
          .single();
          
        if (sellerUser?.user_id) {
          await adminSupabase.auth.admin.updateUserById(sellerUser.user_id, { password });
          console.log('Password updated for seller:', seller.email);
        }
        
        // Send approval email with credentials via Gmail
        await sendApprovalEmailToSeller(
          seller.email,
          seller.email.split('@')[0], // Use part before @ as name
          seller.email,
          password
        );
        console.log('Approval email with credentials sent to:', seller.email);

        // Check if this seller was referred and notify referrer
        try {
          console.log('Checking for referral for seller ID:', sellerId);
          const { data: referral } = await supabase
            .from('referrals')
            .select('referrer_id, referrer_email')
            .eq('referred_id', sellerId)
            .maybeSingle();

          console.log('Referral data found:', referral);

          if (referral && referral.referrer_id) {
            console.log('Found referrer ID:', referral.referrer_id);
            // Get referrer details
            const { data: referrer } = await supabase
              .from('sellers')
              .select('email')
              .eq('id', referral.referrer_id)
              .single();

            console.log('Referrer details:', referrer);

            if (referrer?.email) {
              console.log('Sending referral approval email to:', referrer.email);
              const emailResult = await sendReferralApprovalEmailToSeller(
                referrer.email,
                seller.email.split('@')[0], // Referred seller name
                seller.email,
                50 // Bonus amount
              );
              console.log('Referral email result:', emailResult);
            } else {
              console.log('Referrer email not found for ID:', referral.referrer_id);
            }
          } else {
            console.log('No referral found for seller:', sellerId);
          }
        } catch (referralError) {
          console.error('Error processing referral notification:', referralError);
        }
      } catch (e) {
        console.error('Failed to send approval email:', e);
      }
    }

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
