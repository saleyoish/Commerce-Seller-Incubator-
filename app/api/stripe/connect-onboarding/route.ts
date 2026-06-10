import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT, extractToken } from '@/lib/jwt';
import { createStripeConnectAccount, createConnectOnboardingLink } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const token = extractToken(request.headers, request.cookies);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get seller record using custom auth (id, not user_id)
    const { data: seller, error: sellerError } = await db
      .from('sellers')
      .select('*')
      .eq('id', payload.userId)
      .single();

    if (sellerError || !seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    let stripeAccountId = seller.stripe_account_id;

    // Create Stripe Connect account if not exists
    if (!stripeAccountId) {
      const du= await createStripeConnectAccount(seller.email);
      stripeAccountId = account.id;

      // Update seller with Stripe account ID
      await supabase
        .from('sellers')
        .update({ stripe_account_id: stripeAccountId })
        .eq('id', seller.id);
    }

    // Create onboarding link
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL;
    const accountLink = await createConnectOnboardingLink(
      stripeAccountId,
      `${origin}/dashboard?onboarding=refresh`,
      `${origin}/dashboard?onboarding=success`
    );


    return NextResponse.json({ url: accountLink.url });
  } catch (error: any) {
    console.error('Connect onboarding error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create onboarding link' },
      { status: 500 }
    );
  }
}
