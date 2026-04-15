# Live Commerce Seller Incubator Platform

A full-stack Next.js 14+ application for live commerce sellers to upload products, go live, and sell via seamless Stripe checkout.

## Features

### Seller Features
- **Signup & Auth** - Email/password authentication via Supabase
- **Stripe Connect Onboarding** - Secure seller payouts via Stripe Express
- **Product Management** - Upload products with up to 5 images
- **Live Show Page** - Public page for viewers to watch and buy
- **Dashboard** - Sales tracking, inventory, payout status

### Admin Features
- **Seller Approval** - Approve/reject seller applications
- **Product Oversight** - View and manage all products
- **Sales Tracking** - GMV, platform revenue, transaction history
- **Payout Management** - Manual payouts with $100 minimum threshold

### Platform
- **15% Commission** - Configurable platform fee
- **Secure Checkout** - Stripe Checkout with automatic fee splits
- **Email Notifications** - Resend integration for key events
- **RLS Security** - Row Level Security on all database tables

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Supabase (Auth + PostgreSQL)
- **Payments**: Stripe Connect (Express accounts)
- **Email**: Resend
- **Analytics**: PostHog
- **Deployment**: Vercel

## Quick Start

### 1. Clone & Install
```bash
git clone <repo-url>
cd live-commerce
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Required services:
- **Supabase**: Create project at [supabase.com](https://supabase.com)
- **Stripe**: Create account at [stripe.com](https://stripe.com) + enable Connect
- **Resend**: Create account at [resend.com](https://resend.com)
- **PostHog**: Create project at [posthog.com](https://posthog.com)

### 3. Database Setup
Run the schema in Supabase SQL Editor:
```sql
-- Copy contents from database/schema.sql
```

Create the storage bucket:
1. Go to Storage in Supabase Dashboard
2. Create bucket named `product-images`
3. Make it public
4. Set file size limit to 5MB
5. Allow MIME types: `image/jpeg`, `image/png`, `image/webp`

### 4. Stripe Webhook Setup
After deploying, add webhook endpoint:
- URL: `https://your-app.vercel.app/api/checkout/webhook`
- Events: `checkout.session.completed`, `account.updated`
- Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

### 5. Set Initial Admin
After signing up with your admin email:
```sql
INSERT INTO admins (user_id, email) 
VALUES ('your-auth-user-id', 'admin@example.com');
```

### 6. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
/app
  /signup              → Seller registration
  /login               → Authentication
  /dashboard           → Seller dashboard (protected)
    /products          → Product management
  /live/[sellerId]     → Public live show page
  /success             → Checkout success
  /admin               → Admin dashboard (protected)
    /sellers           → Seller management
    /products          → All products
    /sales             → Sales tracking
    /payouts           → Payout management
  /api
    /checkout          → Stripe Checkout & webhooks
    /stripe            → Connect onboarding
    /admin             → Admin actions
/lib
  /config.ts           → Platform configuration
  /supabase.ts         → Supabase clients
  /stripe.ts           → Stripe integration
  /resend.ts           → Email service
/database
  /schema.sql          → Complete database schema
```

## Configuration

Edit `lib/config.ts` to customize:
- `PLATFORM_FEE_PERCENT` - Commission percentage (default: 15)
- `MIN_PAYOUT_THRESHOLD` - Minimum payout amount (default: $100)
- `MAX_IMAGE_SIZE_MB` - Product image size limit
- `PRODUCT_CATEGORIES` - Available product categories

## Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import to [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy

### Manual
```bash
npm run build
npm start
```

## Testing Checklist

- [ ] Seller signup creates account and seller record
- [ ] Stripe Connect onboarding link works
- [ ] Product upload with images to Supabase Storage
- [ ] Dashboard shows correct stats
- [ ] Live show page displays seller products
- [ ] "Buy Now" creates Stripe Checkout session
- [ ] Successful payment creates sale record
- [ ] Product stock reduces after sale
- [ ] Admin can approve/reject sellers
- [ ] Admin can view all sales and GMV
- [ ] Payout respects $100 minimum threshold
- [ ] Emails send on key events

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stripe/connect-onboarding` | POST | Generate Stripe Connect onboarding link |
| `/api/checkout/create-session` | POST | Create Stripe Checkout session |
| `/api/checkout/webhook` | POST | Handle Stripe webhooks |
| `/api/admin/approve-seller` | POST | Approve/reject seller |
| `/api/admin/trigger-payout` | POST | Manual payout to seller |

## Support

For issues or questions, please contact support.
