import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createTransfer } from '@/lib/stripe';
import { sendPayoutNotification } from '@/lib/resend';
import { PLATFORM_CONFIG } from '@/lib/config';
import { extractToken, verifyJWT } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    // Verify JWT and admin privileges
    const token = extractToken(request.headers);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyJWT(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check admin by id (custom auth) or user_id (Supabase auth)
    const { data: admin } = await db
      .from('admins')
      .select('id')
      .or(`id.eq.${payload.userId},user_id.eq.${payload.userId}`)
      .maybeSingle();

    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { sellerId, amount } = await request.json();

    if (!sellerId || !amount) {
      return NextResponse.json({ error: 'Seller ID and amount are required' }, { status: 400 });
    }

    // Check minimum threshold
    if (amount < PLATFORM_CONFIG.MIN_PAYOUT_THRESHOLD) {
      return NextResponse.json(
        { error: `Amount must be at least $${PLATFORM_CONFIG.MIN_PAYOUT_THRESHOLD}` },
        { status: 400 }
      );
    }

    // Get seller info
    const { data: seller } = await db
      .from('sellers')
      .select('*')
      .eq('id', sellerId)
      .maybeSingle();

    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    if (!seller.stripe_account_id) {
      return NextResponse.json({ error: 'Seller has no Stripe account' }, { status: 400 });
    }

    if (seller.stripe_onboarding_status !== 'active') {
      return NextResponse.json({ error: 'Seller Stripe account is not active' }, { status: 400 });
    }

    // Create Stripe transfer
    const transfer = await createTransfer(amount, seller.stripe_account_id);

    // Send notification
    await sendPayoutNotification(
      seller.email,
      seller.email,
      amount
    );

    return NextResponse.json({ 
      success: true, 
      transferId: transfer.id,
      message: `Payout of $${amount.toFixed(2)} initiated successfully` 
    });
  } catch (error: any) {
    console.error('Trigger payout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process payout' },
      { status: 500 }
    );
  }
}
