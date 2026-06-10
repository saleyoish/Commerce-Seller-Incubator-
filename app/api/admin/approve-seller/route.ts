import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generatePassword, sendApprovalEmailToSeller, sendReferralApprovalEmailToSeller } from '@/lib/gmail';
import { hashPassword } from '@/lib/password';
import { extractToken, verifyJWT } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    // Verify JWT and admin privileges
    const token = extractToken(request.headers, request.cookies);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyJWT(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check admin by id (custom auth) or user_id (Supabase auth)
    const { data: admin } = await db
      .from('admins')
      .select('id')
      .or(`id.eq.${payload.userId},user_id.eq.${payload.userId}`)
      .maybeSingle();

    if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const { sellerId, approve } = await request.json();

    if (!sellerId) {
      return NextResponse.json({ error: 'Seller ID is required' }, { status: 400 });
    }

    // Get seller info
    const { data: seller } = await db.from('sellers').select('*').eq('id', sellerId).maybeSingle();

    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    // Update seller approval status
    const { error: updateError } = await db
      .from('sellers')
      .update({ approval_status: approve ? 'approved' : 'rejected', updated_at: new Date().toISOString() })
      .eq('id', sellerId);

    if (updateError) throw updateError;

    // If approving, generate password, hash it, store and email credentials
    if (approve) {
      try {
        const password = generatePassword();
        const passwordHash = await hashPassword(password);

        await db.from('sellers').update({
          password_hash: passwordHash,
          is_temp_password: true,
          approval_status: 'approved',
          updated_at: new Date().toISOString(),
        }).eq('id', sellerId);

        // Send approval email with credentials via Gmail
        await sendApprovalEmailToSeller(
          seller.email,
          seller.name || seller.email.split('@')[0],
          seller.email,
          password
        );

        // Notify referrer if exists
        try {
          const { data: referral } = await db
            .from('referrals')
            .select('referrer_id')
            .eq('referred_id', sellerId)
            .maybeSingle();

          if (referral?.referrer_id) {
            const { data: referrer } = await db
              .from('sellers')
              .select('email')
              .eq('id', referral.referrer_id)
              .maybeSingle();

            if (referrer?.email) {
              await sendReferralApprovalEmailToSeller(
                referrer.email,
                seller.name || seller.email.split('@')[0],
                seller.email,
                50
              );
            }
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
