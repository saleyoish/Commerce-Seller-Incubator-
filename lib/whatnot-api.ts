// ============================================
// Whatnot Seller API Client
// ============================================
// Note: Whatnot Seller API is currently in Developer Preview and not accepting new applicants
// This implementation uses demo mode for testing purposes

const WHATNOT_API_STAGE_BASE = process.env.WHATNOT_API_BASE || 'https://api.stage.whatnot.com/seller-api/graphql';
const WHATNOT_API_PROD_BASE = process.env.WHATNOT_PROD_API_BASE || 'https://api.whatnot.com/seller-api/graphql';
const WHATNOT_API_BASE = process.env.NODE_ENV === 'production' ? WHATNOT_API_PROD_BASE : WHATNOT_API_STAGE_BASE;

interface WhatnotProduct {
  id?: string;
  title: string;
  description: string;
  category: string;
  price: number;
  currency?: string;
  quantity: number;
  images: string[];
  sku?: string;
  metadata?: Record<string, any>;
}

interface WhatnotOrder {
  id: string;
  status: string;
  buyer_id: string;
  product_id: string;
  quantity: number;
  price: number;
  created_at: string;
}

// ============================================
// PRODUCT API (Demo Mode)
// ============================================

export async function createWhatnotProduct(
  accessToken: string,
  product: WhatnotProduct
): Promise<string> {
  // Demo mode - return mock product ID
  if (accessToken === 'demo_token') {
    console.log('[Whatnot API Demo] Creating product:', product.title);
    return `wn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Real API call when available
  const query = `
    mutation CreateProduct($input: ProductInput!) {
      createProduct(input: $input) {
        id
        title
      }
    }
  `;

  const response = await fetch(WHATNOT_API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      query,
      variables: { input: product },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create Whatnot product: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  return data.data.createProduct.id;
}

export async function updateWhatnotProduct(
  accessToken: string,
  productId: string,
  updates: Partial<WhatnotProduct>
): Promise<void> {
  // Demo mode
  if (accessToken === 'demo_token') {
    console.log('[Whatnot API Demo] Updating product:', productId, updates);
    return;
  }

  const query = `
    mutation UpdateProduct($id: ID!, $input: ProductInput!) {
      updateProduct(id: $id, input: $input) {
        id
        title
      }
    }
  `;

  const response = await fetch(WHATNOT_API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      query,
      variables: { id: productId, input: updates },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to update Whatnot product: ${JSON.stringify(error)}`);
  }
}

export async function getWhatnotProduct(
  accessToken: string,
  productId: string
): Promise<WhatnotProduct> {
  // Demo mode - return mock product
  if (accessToken === 'demo_token') {
    console.log('[Whatnot API Demo] Fetching product:', productId);
    return {
      id: productId,
      title: 'Demo Product',
      description: 'This is a demo product from Whatnot',
      category: 'Collectibles',
      price: 29.99,
      currency: 'USD',
      quantity: 10,
      images: [],
    };
  }

  const query = `
    query GetProduct($id: ID!) {
      product(id: $id) {
        id
        title
        description
        category
        price
        quantity
        images
      }
    }
  `;

  const response = await fetch(WHATNOT_API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      query,
      variables: { id: productId },
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Whatnot product');
  }

  const data = await response.json();
  return data.data.product;
}

export async function listWhatnotProducts(
  accessToken: string,
  params?: { limit?: number; offset?: number; category?: string }
): Promise<{ products: WhatnotProduct[]; total?: number }> {
  // Validate token format
  const trimmedToken = accessToken?.trim();
  
  if (!trimmedToken) {
    throw new Error('Access token is required');
  }

  if (trimmedToken === 'demo_token') {
    console.log('[Whatnot API Demo] Listing products with params:', params);
    const sampleProducts: WhatnotProduct[] = [
      {
        id: 'demo-whatnot-1',
        title: 'Vintage Trading Card Set',
        description: 'A curated collectible card set from Whatnot demo inventory.',
        category: 'collectibles',
        price: 29.99,
        quantity: 12,
        images: ['https://images.unsplash.com/photo-1512436991641-6745cdb1723f'],
        metadata: {
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
      },
      {
        id: 'demo-whatnot-2',
        title: 'Retro Sneakers Bundle',
        description: 'Popular fall sneakers, perfect for live Whatnot drops.',
        category: 'fashion_sneakers',
        price: 59.99,
        quantity: 8,
        images: ['https://images.unsplash.com/photo-1519741491905-4b4ceee96e61'],
        metadata: {
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
      },
      {
        id: 'demo-whatnot-3',
        title: 'Collector Funko Pop Figure',
        description: 'High-demand Funko Pop shipped directly from the Whatnot demo catalog.',
        category: 'toys_funko',
        price: 39.99,
        quantity: 15,
        images: ['https://images.unsplash.com/photo-1536305030010-dc7e2a37e3c7'],
        metadata: {
          created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
      },
    ];
    return {
      products: sampleProducts.slice(0, params?.limit || sampleProducts.length),
      total: sampleProducts.length,
    };
  }

  const query = `
    query ListProducts($limit: Int, $offset: Int, $category: String) {
      products(limit: $limit, offset: $offset, category: $category) {
        id
        title
        description
        category
        price
        quantity
        images
      }
      productsCount
    }
  `;

  console.log('[Whatnot API] Fetching from:', WHATNOT_API_BASE);
  console.log('[Whatnot API] Token length:', trimmedToken.length);
  console.log('[Whatnot API] Token first 10 chars:', trimmedToken.substring(0, 10) + '...');
  console.log('[Whatnot API] Environment:', process.env.NODE_ENV);

  // Try with Bearer prefix first
  let response = await fetch(WHATNOT_API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${trimmedToken}`,
    },
    body: JSON.stringify({
      query,
      variables: params,
    }),
  });

  console.log('[Whatnot API] Response status (Bearer):', response.status);
  
  // If 401 with Bearer, try without Bearer prefix
  if (response.status === 401) {
    console.log('[Whatnot API] 401 with Bearer prefix, trying without Bearer...');
    response = await fetch(WHATNOT_API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': trimmedToken,
      },
      body: JSON.stringify({
        query,
        variables: params,
      }),
    });
    console.log('[Whatnot API] Response status (no Bearer):', response.status);
  }

  if (!response.ok) {
    const responseText = await response.text();
    console.error('[Whatnot API] Error response:', responseText);
    throw new Error(`Whatnot API request failed with status ${response.status}: ${responseText.substring(0, 300)}`);
  }

  const data = await response.json();
  console.log('[Whatnot API] Response data:', data);
  
  if (data.errors) {
    const errorMessage = Array.isArray(data.errors)
      ? data.errors.map((e: any) => e.message).join(', ')
      : data.errors.message || 'Unknown GraphQL error';
    console.error('[Whatnot API] GraphQL error:', errorMessage);
    throw new Error(`Whatnot API error: ${errorMessage}`);
  }

  if (!data.data || !data.data.products) {
    throw new Error('Invalid response structure from Whatnot API');
  }

  return {
    products: data.data.products || [],
    total: data.data.productsCount || 0,
  };
}

export async function updateWhatnotInventory(
  accessToken: string,
  productId: string,
  quantity: number
): Promise<void> {
  // Demo mode
  if (accessToken === 'demo_token') {
    console.log('[Whatnot API Demo] Updating inventory for product:', productId, 'quantity:', quantity);
    return;
  }

  const query = `
    mutation UpdateInventory($id: ID!, $quantity: Int!) {
      updateProductInventory(id: $id, quantity: $quantity) {
        id
        quantity
      }
    }
  `;

  const response = await fetch(WHATNOT_API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      query,
      variables: { id: productId, quantity },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to update Whatnot inventory: ${JSON.stringify(error)}`);
  }
}

// ============================================
// ORDER API (Demo Mode)
// ============================================

export async function listWhatnotOrders(
  accessToken: string,
  params?: { limit?: number; offset?: number; status?: string }
): Promise<{ orders: WhatnotOrder[]; total?: number }> {
  // Demo mode
  if (accessToken === 'demo_token') {
    console.log('[Whatnot API Demo] Listing orders with params:', params);
    return {
      orders: [],
      total: 0,
    };
  }

  const query = `
    query ListOrders($limit: Int, $offset: Int, $status: String) {
      orders(limit: $limit, offset: $offset, status: $status) {
        id
        status
        buyer_id
        product_id
        quantity
        price
        created_at
      }
      ordersCount
    }
  `;

  const response = await fetch(WHATNOT_API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      query,
      variables: params,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to list Whatnot orders');
  }

  const data = await response.json();
  return {
    orders: data.data.orders,
    total: data.data.ordersCount,
  };
}

export async function getWhatnotOrder(
  accessToken: string,
  orderId: string
): Promise<WhatnotOrder> {
  // Demo mode
  if (accessToken === 'demo_token') {
    console.log('[Whatnot API Demo] Fetching order:', orderId);
    return {
      id: orderId,
      status: 'completed',
      buyer_id: 'demo_buyer',
      product_id: 'demo_product',
      quantity: 1,
      price: 29.99,
      created_at: new Date().toISOString(),
    };
  }

  const query = `
    query GetOrder($id: ID!) {
      order(id: $id) {
        id
        status
        buyer_id
        product_id
        quantity
        price
        created_at
      }
    }
  `;

  const response = await fetch(WHATNOT_API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      query,
      variables: { id: orderId },
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Whatnot order');
  }

  const data = await response.json();
  return data.data.order;
}

// ============================================
// CATEGORY MAPPING
// ============================================

export function mapCategoryToWhatnot(category: string): string {
  const categoryMap: Record<string, string> = {
    'Collectibles': 'collectibles',
    'Fashion & Sneakers': 'fashion_sneakers',
    'Electronics': 'electronics',
    'Sports Cards': 'sports_cards',
    'Comics': 'comics',
    'Toys & Funko': 'toys_funko',
    'Art & Prints': 'art_prints',
    'Jewelry & Watches': 'jewelry_watches',
    'Home & Garden': 'home_garden',
    'Fashion': 'fashion',
    'Beauty': 'beauty',
    'Home': 'home',
    'Sports': 'sports',
    'Toys': 'toys',
    'Health': 'health',
    'Other': 'other',
  };

  return categoryMap[category] || 'other';
}

export function mapWhatnotCategoryToLocal(category: string): string {
  const reverseMap: Record<string, string> = {
    'collectibles': 'Collectibles',
    'fashion_sneakers': 'Fashion & Sneakers',
    'electronics': 'Electronics',
    'sports_cards': 'Sports Cards',
    'comics': 'Comics',
    'toys_funko': 'Toys & Funko',
    'art_prints': 'Art & Prints',
    'jewelry_watches': 'Jewelry & Watches',
    'home_garden': 'Home & Garden',
    'fashion': 'Fashion',
    'beauty': 'Beauty',
    'home': 'Home',
    'sports': 'Sports',
    'toys': 'Toys',
    'health': 'Health',
    'other': 'Other',
  };

  return reverseMap[category] || 'Other';
}
