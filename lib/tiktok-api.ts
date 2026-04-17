// ============================================
// TikTok Shop API Client
// ============================================

const TIKTOK_API_BASE = process.env.TIKTOK_API_BASE || 'https://open-api.tiktokglobalshop.com';
const TIKTOK_AUTH_BASE = process.env.TIKTOK_AUTH_BASE || 'https://auth.tiktok-shops.com';

interface TikTokTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

interface TikTokProduct {
  product_id?: string;
  title: string;
  description: string;
  category_id: string;
  brand_id?: string;
  images: string[];
  skus: Array<{
    id?: string;
    seller_sku: string;
    price: {
      amount: string;
      currency: string;
    };
    quantity: number;
  }>;
}

interface TikTokOrder {
  order_id: string;
  status: string;
  buyer_uid: string;
  recipient_info: {
    name: string;
    phone: string;
    address: {
      address_line1: string;
      city: string;
      state: string;
      zip: string;
    };
  };
  item_list: Array<{
    product_id: string;
    sku_id: string;
    product_name: string;
    quantity: number;
    price: string;
  }>;
  payment: {
    sub_total: string;
    shipping_fee: string;
    tax: string;
    discount_amount: string;
    total_amount: string;
  };
  create_time: string;
}

// ============================================
// AUTHENTICATION
// ============================================

export function getTikTokAuthUrl(sellerId: string): string {
  const appKey = process.env.TIKTOK_APP_KEY;
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/tiktok/callback`;
  const state = Buffer.from(JSON.stringify({ sellerId })).toString('base64');
  
  const params = new URLSearchParams({
    app_key: appKey!,
    redirect_uri: redirectUri,
    state: state,
    scope: 'product,order,fulfillment,shop',
  });
  
  return `${TIKTOK_AUTH_BASE}/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<TikTokTokens> {
  const appKey = process.env.TIKTOK_APP_KEY;
  const appSecret = process.env.TIKTOK_APP_SECRET;
  
  const response = await fetch(`${TIKTOK_AUTH_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_key: appKey,
      app_secret: appSecret,
      grant_type: 'authorization_code',
      auth_code: code,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token exchange failed: ${JSON.stringify(error)}`);
  }
  
  const data = await response.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<TikTokTokens> {
  const appKey = process.env.TIKTOK_APP_KEY;
  const appSecret = process.env.TIKTOK_APP_SECRET;
  
  const response = await fetch(`${TIKTOK_AUTH_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_key: appKey,
      app_secret: appSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token refresh failed: ${JSON.stringify(error)}`);
  }
  
  const data = await response.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
  };
}

// ============================================
// SHOP API
// ============================================

export async function getShopInfo(accessToken: string) {
  const response = await fetch(`${TIKTOK_API_BASE}/api/shop/get`, {
    headers: {
      'x-api-key': process.env.TIKTOK_APP_KEY!,
      'x-api-access-token': accessToken,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch shop info');
  }
  
  const data = await response.json();
  return data.data;
}

// ============================================
// PRODUCT API
// ============================================

export async function createTikTokProduct(
  accessToken: string,
  product: TikTokProduct
): Promise<string> {
  const response = await fetch(`${TIKTOK_API_BASE}/api/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.TIKTOK_APP_KEY!,
      'x-api-access-token': accessToken,
    },
    body: JSON.stringify(product),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create product: ${JSON.stringify(error)}`);
  }
  
  const data = await response.json();
  return data.data.product_id;
}

export async function updateTikTokProduct(
  accessToken: string,
  productId: string,
  updates: Partial<TikTokProduct>
): Promise<void> {
  const response = await fetch(`${TIKTOK_API_BASE}/api/products/${productId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.TIKTOK_APP_KEY!,
      'x-api-access-token': accessToken,
    },
    body: JSON.stringify(updates),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to update product: ${JSON.stringify(error)}`);
  }
}

export async function getTikTokProduct(
  accessToken: string,
  productId: string
): Promise<TikTokProduct> {
  const response = await fetch(`${TIKTOK_API_BASE}/api/products/${productId}`, {
    headers: {
      'x-api-key': process.env.TIKTOK_APP_KEY!,
      'x-api-access-token': accessToken,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch product');
  }
  
  const data = await response.json();
  return data.data;
}

export async function listTikTokProducts(
  accessToken: string,
  params?: { page_size?: number; page_token?: string; status?: string }
): Promise<{ products: TikTokProduct[]; next_page_token?: string }> {
  const queryParams = new URLSearchParams();
  if (params?.page_size) queryParams.set('page_size', params.page_size.toString());
  if (params?.page_token) queryParams.set('page_token', params.page_token);
  if (params?.status) queryParams.set('status', params.status);
  
  const response = await fetch(`${TIKTOK_API_BASE}/api/products?${queryParams}`, {
    headers: {
      'x-api-key': process.env.TIKTOK_APP_KEY!,
      'x-api-access-token': accessToken,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to list products');
  }
  
  const data = await response.json();
  return {
    products: data.data.products,
    next_page_token: data.data.next_page_token,
  };
}

export async function updateTikTokInventory(
  accessToken: string,
  productId: string,
  skuId: string,
  quantity: number
): Promise<void> {
  const response = await fetch(`${TIKTOK_API_BASE}/api/products/${productId}/inventory`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.TIKTOK_APP_KEY!,
      'x-api-access-token': accessToken,
    },
    body: JSON.stringify({
      skus: [{ id: skuId, quantity }],
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to update inventory: ${JSON.stringify(error)}`);
  }
}

// ============================================
// ORDER API
// ============================================

export async function listTikTokOrders(
  accessToken: string,
  params?: {
    page_size?: number;
    page_token?: string;
    status?: string;
    create_time_from?: string;
    create_time_to?: string;
  }
): Promise<{ orders: TikTokOrder[]; next_page_token?: string }> {
  const queryParams = new URLSearchParams();
  if (params?.page_size) queryParams.set('page_size', params.page_size.toString());
  if (params?.page_token) queryParams.set('page_token', params.page_token);
  if (params?.status) queryParams.set('status', params.status);
  if (params?.create_time_from) queryParams.set('create_time_from', params.create_time_from);
  if (params?.create_time_to) queryParams.set('create_time_to', params.create_time_to);
  
  const response = await fetch(`${TIKTOK_API_BASE}/api/orders?${queryParams}`, {
    headers: {
      'x-api-key': process.env.TIKTOK_APP_KEY!,
      'x-api-access-token': accessToken,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to list orders');
  }
  
  const data = await response.json();
  return {
    orders: data.data.orders,
    next_page_token: data.data.next_page_token,
  };
}

export async function getTikTokOrder(
  accessToken: string,
  orderId: string
): Promise<TikTokOrder> {
  const response = await fetch(`${TIKTOK_API_BASE}/api/orders/${orderId}`, {
    headers: {
      'x-api-key': process.env.TIKTOK_APP_KEY!,
      'x-api-access-token': accessToken,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch order');
  }
  
  const data = await response.json();
  return data.data;
}

export async function shipTikTokOrder(
  accessToken: string,
  orderId: string,
  trackingInfo: {
    provider: string;
    tracking_number: string;
  }
): Promise<void> {
  const response = await fetch(`${TIKTOK_API_BASE}/api/orders/${orderId}/shipping`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.TIKTOK_APP_KEY!,
      'x-api-access-token': accessToken,
    },
    body: JSON.stringify(trackingInfo),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to ship order: ${JSON.stringify(error)}`);
  }
}

export async function cancelTikTokOrder(
  accessToken: string,
  orderId: string,
  reason: string
): Promise<void> {
  const response = await fetch(`${TIKTOK_API_BASE}/api/orders/${orderId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.TIKTOK_APP_KEY!,
      'x-api-access-token': accessToken,
    },
    body: JSON.stringify({ reason }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to cancel order: ${JSON.stringify(error)}`);
  }
}

// ============================================
// WEBHOOK VERIFICATION
// ============================================

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
