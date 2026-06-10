# TikTok Shop API Integration - Environment Setup

To enable TikTok Shop API integration, add these variables to your `.env.local`:

```env
# ============================================
# TikTok Shop API Configuration
# ============================================

# Your TikTok Shop App credentials (get from https://seller-us.tiktok.com/partner)
TIKTOK_APP_KEY=your_app_key_here
TIKTOK_APP_SECRET=your_app_secret_here

# API Base URLs (use defaults or your regional endpoint)
TIKTOK_API_BASE=https://open-api.tiktokglobalshop.com
TIKTOK_AUTH_BASE=https://auth.tiktok-shops.com

# Webhook secret for verifying TikTok webhooks
TIKTOK_WEBHOOK_SECRET=your_webhook_secret_here

# ============================================
# Required for OAuth callback
# ============================================
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
# Or for local development:
# NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## How to Get TikTok Shop API Access

### Step 1: Apply for TikTok Shop Partner Program
1. Go to https://seller-us.tiktok.com/partner
2. Click "Apply to Become a Partner"
3. Fill out the application with your business details
4. Wait for approval (usually 3-5 business days)

### Step 2: Create Your App
1. Once approved, log into the Partner Portal
2. Go to "My Apps" → "Create New App"
3. Fill in app details:
   - App Name: Your Platform Name
   - App Description: Brief description
   - Callback URL: `https://yourdomain.com/api/tiktok/callback`
4. Select required permissions:
   - `product` - Product management
   - `order` - Order management
   - `fulfillment` - Shipping management
   - `finance` - Payment/commission data

### Step 3: Get Your Credentials
After app creation, you'll receive:
- **App Key** (TIKTOK_APP_KEY)
- **App Secret** (TIKTOK_APP_SECRET)

### Step 4: Configure Webhooks
1. In Partner Portal, go to your app's webhook settings
2. Set webhook URL: `https://yourdomain.com/api/tiktok/webhook`
3. Select events to subscribe to:
   - PRODUCT_UPDATE
   - ORDER_STATUS_CHANGE
   - INVENTORY_CHANGE
   - SHIPMENT_UPDATE
4. Copy the webhook secret to TIKTOK_WEBHOOK_SECRET

## Testing Without TikTok API Access

If you don't have TikTok Partner access yet, you can:

1. **Mock the API responses** for development
2. **Use the sandbox environment** (if available in your region)
3. **Apply for access** and continue building other features

The integration will gracefully handle missing credentials by showing a "Connect" button that guides sellers through the process.

## Features Enabled

Once configured, your platform supports:

- ✅ **OAuth Connection** - Sellers connect their TikTok Shop
- ✅ **Product Sync** - Push products to TikTok Shop
- ✅ **Order Sync** - Pull orders from TikTok Shop
- ✅ **Inventory Sync** - Keep stock levels in sync
- ✅ **Webhook Events** - Real-time updates from TikTok
- ✅ **Referral Tracking** - $50 bonus when referred sellers make first TikTok sale
- ✅ **Admin Dashboard** - Monitor all TikTok-connected sellers

## API Rate Limits

TikTok Shop API has rate limits:
- 100 requests/minute for most endpoints
- 1000 requests/day for product listing

The sync operations are designed to respect these limits with pagination and batching.
