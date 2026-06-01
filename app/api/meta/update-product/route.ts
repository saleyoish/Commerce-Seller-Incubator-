import { NextRequest, NextResponse } from 'next/server';
import { createServerSideSupabase } from '@/lib/supabase-server';
import { updateCatalogProduct, fetchOwnedCatalogs, fetchUserBusinesses } from '@/lib/meta-service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSideSupabase();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get seller ID
    const { data: seller } = await supabase
      .from('sellers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    const body = await request.json();
    const { productId, name, description, price, category } = body;

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Get product details
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('seller_id', seller.id)
      .single();

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check if product is from Meta
    if (product.source_platform !== 'meta') {
      return NextResponse.json({ error: 'Product is not from Meta Commerce Shop' }, { status: 400 });
    }

    // Get Meta connection
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('seller_id', seller.id)
      .eq('platform', 'meta')
      .single();

    if (!connection) {
      return NextResponse.json({ error: 'Meta connection not found' }, { status: 404 });
    }

    const accessToken = connection.access_token;
    if (!accessToken) {
      return NextResponse.json({ error: 'Meta access token not found' }, { status: 400 });
    }

    // Get Meta business ID
    const businesses = await fetchUserBusinesses(accessToken);
    if (!businesses || businesses.length === 0) {
      return NextResponse.json({ error: 'No Meta businesses found' }, { status: 404 });
    }

    const businessId = businesses[0].id;

    // Get Meta catalog ID
    const catalogs = await fetchOwnedCatalogs(businessId, accessToken);
    if (!catalogs || catalogs.length === 0) {
      return NextResponse.json({ error: 'No Meta catalogs found' }, { status: 404 });
    }

    const catalogId = catalogs[0].id;

    // Get the Meta product ID from metadata or use the product ID
    const metaProductId = product.metadata?.meta_product_id || product.id;

    // Update product on Meta
    const result = await updateCatalogProduct(
      catalogId,
      metaProductId,
      accessToken,
      {
        name: name || product.name,
        description: description || product.description,
        price: price || product.price,
        category: category || product.category,
      }
    );

    console.log('[Meta Update Product] Result:', result);

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('[Meta Update Product] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update product on Meta' },
      { status: 500 }
    );
  }
}
