# Vercel Deployment Guide — isellish.com

## Prerequisites

- GitHub repository connected to Vercel
- Vercel account at [vercel.com](https://vercel.com)
- All third-party accounts set up (Supabase, Stripe, Gmail, etc.)

---

## 1. Project Settings

In your Vercel dashboard → Project → Settings:

| Setting | Value |
|---|---|
| Framework Preset | Next.js |
| Root Directory | `.` (leave default) |
| Build Command | `npm run build` |
| Output Directory | `.next` (leave default) |
| Install Command | `npm install` |
| Node.js Version | 20.x |

---

## 2. Environment Variables

Go to **Vercel Dashboard → Project → Settings → Environment Variables** and add every variable below. Set each one for **Production**, **Preview**, and **Development** unless noted otherwise.

### Supabase

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://lrntlsdjgcukrkkxzjza.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_2ArI1sTdLc5Q2wzMhFmCDA_PUa27RqO` |
| `SUPABASE_SECRET_KEY` | `sb_secret_ocnfGHj3syaGvHk1toO3uQ_D5-ZNanE` |

> `NEXT_PUBLIC_` variables are safe to expose in the browser. `SUPABASE_SECRET_KEY` must only be used server-side — never expose it in client code.

### Stripe

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_51TS2yO...` |
| `STRIPE_SECRET_KEY` | `sk_test_51TS2yO...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_ONo8SQZ...` |

> When you go live, replace `pk_test_` / `sk_test_` with your live Stripe keys.

### Email — Resend (password reset)

| Variable | Value |
|---|---|
| `RESEND_API_KEY` | `re_4rnE5inj_...` |
| `FROM_EMAIL` | `onboarding@resend.dev` |

> For production, replace `FROM_EMAIL` with a verified domain email in Resend.

### Email — Gmail (seller notifications)

| Variable | Value |
|---|---|
| `GMAIL_USER` | `theabdulmuqeet@gmail.com` |
| `GMAIL_APP_PASSWORD` | `rkbylzdchkmwbzth` |

> This is a 16-character Google App Password, not your regular Gmail password. Generate it at: Google Account → Security → 2-Step Verification → App passwords.

### Analytics — PostHog

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | `phc_uuHZ4eXp...` |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://us.i.posthog.com` |

### Site URL

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://www.isellish.com` |

> This is used for password reset redirect links. Must match your production domain exactly.

### Platform Config

| Variable | Value |
|---|---|
| `PLATFORM_FEE_PERCENT` | `15` |
| `MIN_PAYOUT_THRESHOLD` | `100` |
| `ADMIN_EMAIL` | `onboarding@resend.dev` |

### TikTok Shop

| Variable | Value |
|---|---|
| `TIKTOK_APP_KEY` | `6k0fjpu78altn` |
| `TIKTOK_APP_SECRET` | `266c082075af54d88adff61a748fa2631112d0aa` |
| `TIKTOK_API_BASE` | `https://open-api.tiktokglobalshop.com` |
| `TIKTOK_AUTH_BASE` | `https://auth.tiktok-shops.com` |

### Meta / Facebook

| Variable | Value |
|---|---|
| `META_APP_ID` | `1637035807597088` |
| `META_APP_SECRET` | `eb40abb3c71fb48b2433b9e5de390552` |
| `FACEBOOK_REDIRECT_URI` | `https://www.isellish.com/api/facebook/callback` |
| `INSTAGRAM_REDIRECT_URI` | `https://www.isellish.com/api/instagram/callback` |

### YouTube

| Variable | Value |
|---|---|
| `YOUTUBE_CLIENT_ID` | `643045035996-bg28q0pfvjp8...` |
| `YOUTUBE_CLIENT_SECRET` | `GOCSPX-kUEC90rWHDzla...` |

---

## 3. Custom Domain

1. Go to **Vercel Dashboard → Project → Settings → Domains**
2. Add `isellish.com` and `www.isellish.com`
3. Vercel will show you DNS records to add at your domain registrar:
   - For `www`: CNAME → `cname.vercel-dns.com`
   - For apex (`isellish.com`): A record → `76.76.21.21`
4. Wait for DNS propagation (usually 5–30 minutes)
5. Vercel auto-provisions an SSL certificate via Let's Encrypt

---

## 4. Stripe Webhook Setup

After deploying, register the webhook endpoint with Stripe so checkout and payout events are processed:

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. URL: `https://www.isellish.com/api/checkout/webhook`
4. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy the **Signing secret** → paste into Vercel as `STRIPE_WEBHOOK_SECRET`
6. Redeploy once after updating that variable

---

## 5. Supabase Configuration

### Auth Redirect URLs

In your [Supabase Dashboard → Authentication → URL Configuration](https://supabase.com/dashboard):

- **Site URL**: `https://www.isellish.com`
- **Redirect URLs** (add all of these):
  ```
  https://www.isellish.com/**
  https://www.isellish.com/reset-password
  https://www.isellish.com/login
  ```

If redirect URLs are not set, password reset links and OAuth flows will fail.

### RLS (Row Level Security)

Ensure RLS is enabled on all tables. The app relies on it for data isolation. Check in Supabase Dashboard → Table Editor → each table → RLS enabled.

---

## 6. Deploying

### Auto-deploy (recommended)

Every push to the `main` branch triggers an automatic Vercel deployment. No manual steps needed.

```bash
git add .
git commit -m "your message"
git push origin main
```

### Manual deploy

From Vercel dashboard → Project → Deployments → **Redeploy** on any existing deployment.

Or via CLI:
```bash
npx vercel --prod
```

---

## 7. Checking a Deployment

1. Go to **Vercel Dashboard → Project → Deployments**
2. Click the latest deployment
3. Check **Build Logs** for any errors
4. Once status shows **Ready**, the site is live

Common build errors and fixes:

| Error | Fix |
|---|---|
| `Missing NEXT_PUBLIC_SUPABASE_URL` | Add the env variable in Vercel settings and redeploy |
| `Both middleware.ts and proxy.ts detected` | Delete `middleware.ts` — only `proxy.ts` should exist |
| TypeScript errors | Already suppressed via `ignoreBuildErrors: true` in `next.config.ts` |

---

## 8. After Every Deployment — Smoke Test

1. Visit `https://www.isellish.com/login`
2. Log in with a seller account
3. Click each sidebar link (Products, Sales, Earnings, etc.) — none should redirect to login
4. Log out and verify you land on `/login`
5. Log in with an admin account and verify `/admin` loads

---

## 9. Environment Variable Checklist

Before deploying to production, confirm these are set in Vercel:

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- [ ] `SUPABASE_SECRET_KEY`
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `RESEND_API_KEY`
- [ ] `FROM_EMAIL`
- [ ] `GMAIL_USER`
- [ ] `GMAIL_APP_PASSWORD`
- [ ] `NEXT_PUBLIC_POSTHOG_KEY`
- [ ] `NEXT_PUBLIC_POSTHOG_HOST`
- [ ] `NEXT_PUBLIC_SITE_URL`
- [ ] `PLATFORM_FEE_PERCENT`
- [ ] `MIN_PAYOUT_THRESHOLD`
- [ ] `ADMIN_EMAIL`
