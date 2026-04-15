import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { sendSaleNotification } from '@/lib/resend';
import { PLATFORM_CONFIG } from '@/lib/config';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature || !webhookSecret) {
      return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const supabase = createAdminSupabase();

    // Handle successful payment
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      const { productId, sellerId, quantity } = session.metadata || {};
      
      if (!productId || !sellerId) {
        console.error('Missing metadata in checkout session');
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
      }

      // Get product details
      const { data: product } = await supabase
        .from('products')
        .select('*, sellers(email, stripe_account_id)')
        .eq('id', productId)
        .single();

      if (!product) {
        console.error('Product not found:', productId);
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }

      // Calculate amounts
      const amount = session.amount_total! / 100; // Convert from cents
      const platformFee = amount * (PLATFORM_CONFIG.PLATFORM_FEE_PERCENT / 100);

      // Create sale record
      const { error: saleError } = await supabase.from('sales').insert({
        seller_id: sellerId,
        product_id: productId,
        amount,
        platform_fee: platformFee,
        stripe_payment_intent_id: session.payment_intent as string,
        stripe_checkout_session_id: session.id,
        status: 'completed',
        quantity: parseInt(quantity || '1'),
        buyer_email: session.customer_details?.email || null,
      });

      if (saleError) {
        console.error('Failed to create sale record:', saleError);
        return NextResponse.json({ error: 'Failed to create sale' }, { status: 500 });
      }

      // Reduce product stock
      const { error: stockError } = await supabase
        .from('products')
        .update({ stock_quantity: product.stock_quantity - parseInt(quantity || '1') })
        .eq('id', productId);

      if (stockError) {
        console.error('Failed to reduce stock:', stockError);
      }

      // Send notification email to seller
      await sendSaleNotification(
        product.sellers.email,
        product.sellers.email, // Using email as name for now
        product.name,
        amount - platformFee
      );

      console.log(`Sale completed: ${productId}, amount: ${amount}, seller: ${sellerId}`);
    }

    // Handle account updates (for Stripe Connect)
    if (event.type === 'account.updated') {
      const account = event.data.object;
      
      // Find seller with this Stripe account
      const { data: seller } = await supabase
        .from('sellers')
        .select('*')
        .eq('stripe_account_id', account.id)
        .single();

      if (seller) {
        const isActive = account.charges_enabled && account.payouts_enabled;
        
        await supabase
          .from('sellers')
          .update({
            stripe_onboarding_status: isActive ? 'active' : 'pending',
          })
          .eq('id', seller.id);

        console.log(`Updated seller ${seller.id} Stripe status to ${isActive ? 'active' : 'pending'}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
