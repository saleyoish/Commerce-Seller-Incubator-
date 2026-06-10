import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT, extractToken } from '@/lib/jwt';
import { stripe } from '@/lib/stripe';

export async function GET(request: NextRequest) {
  try {
    const token = extractToken(request.headers, request.cookies);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get seller's Stripe account ID using custom auth (id, not user_id)
    const { data: seller } = await db
      .from('sellers')
      .select('stripe_account_id')
      .eq('id', payload.userId)
      .single();

    if (!seller?.stripe_account_id) {
      return NextResponse.json({
        status: 'not_started',
        isActive: false
      });
    }

    // Fetch account details from Stripe
    const account = await stripe.accounts.retrieve(seller.stripe_account_id);

    const isActive = account.charges_enabled && account.payouts_enabled;

    // Update seller record if status changed
    if (isActive) {
      await db
        .from('sellers')
        .update({ stripe_onboarding_status: 'active' })
        .eq('id', payload.userId);
    }

    return NextResponse.json({
      status: isActive ? 'active' : 'pending',
      isActive,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    });
  } catch (error: any) {
    console.error('Check account status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check account status' },
      { status: 500 }
    );
  }
}
