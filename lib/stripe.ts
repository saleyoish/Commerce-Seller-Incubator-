import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (!stripeSecretKey) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

if (!stripePublishableKey) {
  throw new Error('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable');
}

// Server-side Stripe client (uses secret key)
export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2026-03-25.dahlia', // Latest API version
  typescript: true,
});

// Export publishable key for client-side
export const getStripePublishableKey = () => stripePublishableKey;

// Helper functions for Stripe Connect
export const createStripeConnectAccount = async (email: string) => {
  const account = await stripe.accounts.create({
    type: 'express',
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });
  return account;
};

export const createConnectOnboardingLink = async (accountId: string, refreshUrl: string, returnUrl: string) => {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });
  return accountLink;
};

export const retrieveConnectAccount = async (accountId: string) => {
  return await stripe.accounts.retrieve(accountId);
};

// Checkout session for buyers
export const createCheckoutSession = async (params: {
  productName: string;
  productPrice: number;
  quantity: number;
  sellerStripeAccountId: string;
  productId: string;
  sellerId: string;
  successUrl: string;
  cancelUrl: string;
  platformFeePercent: number;
}) => {
  const { 
    productName, 
    productPrice, 
    quantity, 
    sellerStripeAccountId, 
    productId, 
    sellerId,
    successUrl, 
    cancelUrl,
    platformFeePercent 
  } = params;

  const unitAmount = Math.round(productPrice * 100); // Convert to cents
  const totalAmount = unitAmount * quantity;
  const platformFee = Math.round(totalAmount * (platformFeePercent / 100));

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: productName,
          },
          unit_amount: unitAmount,
        },
        quantity,
      },
    ],
    payment_intent_data: {
      transfer_data: {
        destination: sellerStripeAccountId,
      },
      application_fee_amount: platformFee,
    },
    metadata: {
      productId,
      sellerId,
      quantity: quantity.toString(),
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return session;
};

// Create transfer for manual payouts
export const createTransfer = async (amount: number, destination: string) => {
  const transfer = await stripe.transfers.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency: 'usd',
    destination,
  });
  return transfer;
};
