import crypto from 'crypto';

const GRAPH_API_BASE = 'https://graph.facebook.com';
// Updated to v19.0 to ensure compatibility with modern permissions mapping
const GRAPH_API_VERSION = 'v19.0'; 

type ExchangeTokenResult = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

type MetaProduct = {
  id: string;
  name?: string;
  description?: string;
  price?: string | number | null;
  imageUrl?: string | null;
  stock?: number | null;
  status?: string;
  availability?: string;
  variants?: any[];
  retailer_id?: string;
  retailer_price?: number;
  category?: string;
  sale_price?: number;
  sku?: string;
  raw?: any;
};

async function fetchJson(url: string, opts: RequestInit = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch (err) {
    // not JSON
  }

  if (!res.ok) {
    const message = body?.error?.message || text || `HTTP ${res.status}`;
    const err = new Error(message);
    // @ts-ignore attach response for debugging
    err['status'] = res.status;
    // @ts-ignore attach body
    err['body'] = body;
    throw err;
  }

  if (body?.error) {
    throw new Error(body.error.message || JSON.stringify(body.error));
  }

  return body;
}

/**
 * Exchange a client-side short-lived access token for a long-lived user access token
 * @param appId Meta App ID (or use process.env.META_APP_ID)
 * @param appSecret Meta App Secret (or use process.env.META_APP_SECRET)
 * @param shortLivedToken short-lived token from client
 */
export async function exchangeShortLivedToken(
  appId: string | undefined,
  appSecret: string | undefined,
  shortLivedToken: string
): Promise<ExchangeTokenResult> {
  if (!appId) throw new Error('META_APP_ID is required');
  if (!appSecret) throw new Error('META_APP_SECRET is required');
  if (!shortLivedToken) throw new Error('shortLivedToken is required');

  const url = `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(
    appId
  )}&client_secret=${encodeURIComponent(appSecret)}&fb_exchange_token=${encodeURIComponent(shortLivedToken)}`;

  const body = await fetchJson(url, { method: 'GET' });
  return body as ExchangeTokenResult;
}

/**
 * Fetch businesses for the current user 
 * Note: Requires 'business_management' permission. 
 * 'pages_read_engagement' is no longer needed here.
 */
export async function fetchUserBusinesses(userAccessToken: string) {
  const url = `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/me/businesses?access_token=${encodeURIComponent(
    userAccessToken
  )}`;
  const body = await fetchJson(url);
  return body.data || [];
}

/**
 * Fetch owned product catalogs for a business
 */
export async function fetchOwnedCatalogs(businessId: string, userAccessToken: string) {
  const url = `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${encodeURIComponent(
    businessId
  )}/owned_product_catalogs?access_token=${encodeURIComponent(userAccessToken)}`;
  const body = await fetchJson(url);
  return body.data || [];
}

/**
 * Fetch products from a catalog and normalize them into a simple product array
 */
export async function fetchCatalogProducts(catalogId: string, userAccessToken: string): Promise<MetaProduct[]> {
  // We'll page until no next page or safety limit
  const limit = 200;
  let url = `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${encodeURIComponent(
    catalogId
  )}/products?fields=id,name,description,price,availability,retailer_id,retailer_price,images.limit(1){url},variants,category,product_category,google_product_category&limit=${limit}&access_token=${encodeURIComponent(
    userAccessToken
  )}`;

  const products: MetaProduct[] = [];
  let safety = 0;
  while (url && safety < 50) {
    const body = await fetchJson(url, { method: 'GET' });
    const data = body.data || [];
    for (const p of data) {
      const imageUrl = p.images?.data?.[0]?.url || p.image_url || null;
      // Try multiple price fields from Facebook's catalog API
      // Facebook returns price as string like "$100.40", need to strip currency symbol
      let price = p.price ?? p.retailer_price?.amount ?? p.retailer_price ?? null;
      if (typeof price === 'string') {
        // Remove currency symbols and parse
        const numericPrice = parseFloat(price.replace(/[^0-9.-]+/g, ''));
        price = isNaN(numericPrice) ? null : numericPrice;
      }
      
      // Extract retailer price separately
      let retailerPrice = p.retailer_price?.amount ?? p.retailer_price ?? null;
      if (typeof retailerPrice === 'string') {
        const numericRetailerPrice = parseFloat(retailerPrice.replace(/[^0-9.-]+/g, ''));
        retailerPrice = isNaN(numericRetailerPrice) ? null : numericRetailerPrice;
      }
      
      // Extract sale price if available
      let salePrice = p.sale_price ?? p.inventory?.sale_price ?? null;
      if (typeof salePrice === 'string') {
        const numericSalePrice = parseFloat(salePrice.replace(/[^0-9.-]+/g, ''));
        salePrice = isNaN(numericSalePrice) ? null : numericSalePrice;
      }
      
      const stock = typeof p.availability === 'number' ? p.availability : null;
      const availability = p.availability || 'in_stock';
      const status = p.product_item_approval_status || 'active';
      const variants = p.variants?.data || [];
      // Try multiple category fields from Meta API
      const category = p.category || p.product_category || p.google_product_category || 'Other';
      
      console.log('[Meta Service] Raw product data:', JSON.stringify(p, null, 2));
      console.log('[Meta Service] Product price data:', {
        id: p.id,
        name: p.name,
        price: p.price,
        retailer_price: p.retailer_price,
        sale_price: salePrice,
        finalPrice: price,
        availability,
        status,
        category,
        variantsCount: variants.length
      });
      products.push({
        id: p.id,
        name: p.name,
        description: p.description,
        price,
        imageUrl,
        stock,
        status,
        availability,
        variants,
        retailer_id: p.retailer_id,
        retailer_price: retailerPrice,
        category,
        sale_price: salePrice,
        raw: p,
      });
    }

    // paging
    url = body.paging?.next || null;
    safety++;
  }

  return products;
}

/**
 * Run a batch update against a catalog to update product inventory.
 * updates: Array of { productId, quantity, availability }
 */
export async function updateCatalogInventoryBatch(
  catalogId: string,
  userAccessToken: string,
  updates: Array<{ productId: string; quantity?: number; availability?: 'in_stock' | 'out_of_stock' | string }>
) {
  if (!updates || updates.length === 0) return { success: true, results: [] };

  // Build operations suitable for the Catalog Batch endpoint
  const operations = updates.map((u) => {
    const params = new URLSearchParams();
    if (u.availability) params.set('availability', u.availability);
    if (typeof u.quantity === 'number') params.set('quantity', String(u.quantity));
    // The relative URL should be the product node id path
    return {
      method: 'POST',
      relative_url: `${encodeURIComponent(u.productId)}?${params.toString()}`,
    };
  });

  const url = `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${encodeURIComponent(catalogId)}/batch?access_token=${encodeURIComponent(
    userAccessToken
  )}`;

  const body = await fetchJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operations }),
  });

  return body;
}

/**
 * Update a single product in Meta Commerce catalog
 */
export async function updateCatalogProduct(
  catalogId: string,
  productId: string,
  userAccessToken: string,
  updates: {
    name?: string;
    description?: string;
    price?: number;
    availability?: string;
    category?: string;
  }
) {
  const params = new URLSearchParams();
  if (updates.name) params.set('name', updates.name);
  if (updates.description) params.set('description', updates.description);
  if (updates.price) params.set('price', String(updates.price));
  if (updates.availability) params.set('availability', updates.availability);
  if (updates.category) params.set('category', updates.category);

  const url = `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${encodeURIComponent(catalogId)}/${encodeURIComponent(productId)}?${params.toString()}&access_token=${encodeURIComponent(userAccessToken)}`;

  const body = await fetchJson(url, {
    method: 'POST',
  });

  return body;
}

/**
 * Send a Purchase event to Meta Conversions API (CAPI)
 * @param pixelId Meta Pixel ID
 * @param accessToken CAPI Access Token (business-level)
 * @param event payload including order value, currency, buyer email, and items
 */
export async function sendPurchaseEventToCAPI(
  pixelId: string,
  accessToken: string,
  event: {
    value: number;
    currency: string;
    email?: string;
    content_ids?: string[];
    contents?: Array<{ id: string; quantity: number; item_price?: number }>;
    order_id?: string;
    event_source_url?: string;
  }
) {
  if (!pixelId) throw new Error('pixelId is required');
  if (!accessToken) throw new Error('CAPI access token is required');

  const event_time = Math.floor(Date.now() / 1000);

  const user_data: any = {};
  if (event.email) {
    const normalized = (event.email || '').trim().toLowerCase();
    user_data.em = crypto.createHash('sha256').update(normalized).digest('hex');
  }

  const custom_data: any = {
    value: event.value,
    currency: event.currency,
  };
  if (event.content_ids) custom_data.content_ids = event.content_ids;
  if (event.contents) custom_data.contents = event.contents.map((c) => ({ id: c.id, quantity: c.quantity }));

  const payload = {
    data: [
      {
        event_name: 'Purchase',
        event_time,
        event_source_url: event.event_source_url || undefined,
        user_data: Object.keys(user_data).length ? user_data : undefined,
        custom_data,
        action_source: 'website',
        event_id: event.order_id || undefined,
      },
    ],
  };

  const url = `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(
    accessToken
  )}`;

  const body = await fetchJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return body;
}

export default {
  exchangeShortLivedToken,
  fetchUserBusinesses,
  fetchOwnedCatalogs,
  fetchCatalogProducts,
  updateCatalogInventoryBatch,
  sendPurchaseEventToCAPI,
};