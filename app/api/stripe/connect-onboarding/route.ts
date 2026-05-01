import { NextRequest, NextResponse } from 'next/server';
import { createServerSideSupabase } from '@/lib/supabase-server';
import { createStripeConnectAccount, createConnectOnboardingLink } from '@/lib/stripe';
import { getPostHogClient } from '@/lib/posthog-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSideSupabase();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get seller record
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (sellerError || !seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    let stripeAccountId = seller.stripe_account_id;

    // Create Stripe Connect account if not exists
    if (!stripeAccountId) {
      const account = await createStripeConnectAccount(seller.email);
      stripeAccountId = account.id;

      // Update seller with Stripe account ID
      await supabase
        .from('sellers')
        .update({ stripe_account_id: stripeAccountId })
        .eq('id', seller.id);
    }

    // Create onboarding link
    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const accountLink = await createConnectOnboardingLink(
      stripeAccountId,
      `${origin}/dashboard?onboarding=refresh`,
      `${origin}/dashboard?onboarding=success`
    );

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: session.user.email || seller.id,
      event: 'stripe_connect_started',
      properties: {
        seller_id: seller.id,
        stripe_account_id: stripeAccountId,
        is_new_account: !seller.stripe_account_id,
      },
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error: any) {
    console.error('Connect onboarding error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create onboarding link' },
      { status: 500 }
    );
  }
}
