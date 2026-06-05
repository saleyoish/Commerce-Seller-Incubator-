import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { createCheckoutSession } from '@/lib/stripe';
import { PLATFORM_CONFIG } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const { productId, quantity = 1, buyerEmail } = await request.json();

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const supabase = createAdminSupabase();

    // Get product with seller info
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*, sellers(*)')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check stock
    if (product.stock_quantity < quantity) {
      return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 });
    }

    // Check seller Stripe status
    if (!product.sellers.stripe_account_id || product.sellers.stripe_onboarding_status !== 'active') {
      return NextResponse.json({ error: 'Seller not ready to accept payments' }, { status: 400 });
    }

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL;

    // Create Stripe Checkout Session
    const session = await createCheckoutSession({
      productName: product.name,
      productPrice: product.price,
      quantity,
      sellerStripeAccountId: product.sellers.stripe_account_id,
      productId: product.id,
      sellerId: product.seller_id,
      successUrl: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/live/${product.seller_id}`,
      platformFeePercent: PLATFORM_CONFIG.PLATFORM_FEE_PERCENT,
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error('Checkout session error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
