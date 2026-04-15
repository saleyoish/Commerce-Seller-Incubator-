import { NextRequest, NextResponse } from 'next/server';
import { createServerSideSupabase } from '@/lib/supabase-server';
import { stripe } from '@/lib/stripe';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSideSupabase();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get seller's Stripe account ID
    const { data: seller } = await supabase
      .from('sellers')
      .select('stripe_account_id')
      .eq('user_id', session.user.id)
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
      await supabase
        .from('sellers')
        .update({ stripe_onboarding_status: 'active' })
        .eq('user_id', session.user.id);
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
