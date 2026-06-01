import { createAdminSupabase } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';
import { fetchUserBusinesses, fetchOwnedCatalogs, fetchCatalogProducts } from '@/lib/meta-service';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get('sellerId');

    console.log('[Sync Products] Starting sync for sellerId:', sellerId);

    if (!sellerId) {
      return NextResponse.json(
        { error: 'Missing sellerId' },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabase();

    // Get Instagram connection
    const { data: connection, error: connError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('seller_id', sellerId)
      .eq('platform', 'instagram')
      .maybeSingle();

    console.log('[Sync Products] Connection query result:', { 
      connection: connection ? 'found' : 'not found', 
      connError,
      hasAccessToken: !!connection?.access_token 
    });

    if (connError) {
      console.error('[Sync Products] Database error:', connError);
      return NextResponse.json(
        { error: `Database error: ${connError.message}` },
        { status: 500 }
      );
    }

    if (!connection) {
      console.error('[Sync Products] No connection found for seller:', sellerId);
      return NextResponse.json(
        { error: 'Instagram connection not found. Please connect your Instagram account first.' },
        { status: 404 }
      );
    }

    // Get access token from connection or metadata
    const accessToken = connection.access_token || connection.metadata?.access_token;
    
    if (!accessToken) {
      console.error('[Sync Products] Connection exists but no access token in either field');
      return NextResponse.json(
        { error: 'Instagram access token missing. Please reconnect your Instagram account.' },
        { status: 400 }
      );
    }

    // Fetch Instagram user businesses
    let businesses;
    try {
      console.log('[Sync Products] Fetching businesses with token...');
      businesses = await fetchUserBusinesses(accessToken);
      console.log('[Sync Products] Businesses fetched:', businesses?.length || 0);
    } catch (error) {
      console.error('[Sync Products] Error fetching businesses:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('Missing Permission') || message.includes('#100') || message.includes('Invalid OAuth')) {
        return NextResponse.json(
          { 
            error: 'Instagram token invalid or expired. Please disconnect and reconnect your Instagram account.',
            syncedCount: 0 
          },
          { status: 403 }
        );
      }
      throw error;
    }

    if (!businesses || businesses.length === 0) {
      console.log('[Sync Products] No businesses found');
      return NextResponse.json({ error: 'No businesses found', syncedCount: 0 }, { status: 200 });
    }

    let catalogs;
    try {
      // Fetch catalogs for first business
      console.log('[Sync Products] Fetching catalogs for business:', businesses[0].id);
      catalogs = await fetchOwnedCatalogs(businesses[0].id, accessToken);
      console.log('[Sync Products] Catalogs fetched:', catalogs?.length || 0);
    } catch (error) {
      console.error('[Sync Products] Error fetching catalogs:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('Missing Permission') || message.includes('#100') || message.includes('Invalid OAuth')) {
        return NextResponse.json(
          { 
            error: 'Instagram token invalid or expired. Please disconnect and reconnect your Instagram account.',
            syncedCount: 0 
          },
          { status: 403 }
        );
      }
      throw error;
    }

    if (!catalogs || catalogs.length === 0) {
      console.log('[Sync Products] No catalogs found');
      return NextResponse.json({ error: 'No catalogs found', syncedCount: 0 }, { status: 200 });
    }

    let totalProductsSynced = 0;

    // Fetch products from all catalogs and insert/update in DB
    for (const catalog of catalogs) {
      let metaProducts: Awaited<ReturnType<typeof fetchCatalogProducts>> = [];
      try {
        console.log(`[Sync Products] Fetching products from catalog ${catalog.id}...`);
        metaProducts = await fetchCatalogProducts(catalog.id, accessToken);
        console.log(`[Sync Products] Fetched ${metaProducts.length} products from catalog ${catalog.id}`);
      } catch (catalogError) {
        // Log error but continue with next catalog
        console.error(`[Sync Products] Failed to fetch products from catalog ${catalog.id}:`, catalogError);
        continue;
      }

      for (const metaProduct of metaProducts) {
        try {
          // Check if product already exists for this seller with same name (since we don't have platform_id mapping)
          const { data: existingProduct } = await supabase
            .from('products')
            .select('id')
            .eq('seller_id', sellerId)
            .eq('name', metaProduct.name || 'Untitled')
            .maybeSingle();

          const productData: any = {
            seller_id: sellerId,
            name: metaProduct.name || 'Untitled',
            description: metaProduct.description || '',
            price: (metaProduct.price != null && !isNaN(parseFloat(String(metaProduct.price)))) ? parseFloat(String(metaProduct.price)) : 0,
            category: 'Other', // Default category since Instagram doesn't provide this
            stock_quantity: metaProduct.stock || 0,
            images: metaProduct.imageUrl ? [metaProduct.imageUrl] : [],
            status: 'active' as const,
          };

          if (existingProduct) {
            // Update existing product
            const { error: updateError } = await supabase
              .from('products')
              .update(productData)
              .eq('id', existingProduct.id);
            if (updateError) {
              console.error('[Sync Products] Error updating product:', updateError);
              throw updateError;
            }
          } else {
            // Insert new product
            const { error: insertError } = await supabase.from('products').insert(productData);
            if (insertError) {
              console.error('[Sync Products] Error inserting product:', JSON.stringify(insertError));
              console.error('[Sync Products] Product data being inserted:', JSON.stringify(productData));
              throw new Error(`Database insert error: ${insertError.message || JSON.stringify(insertError)}`);
            }
          }

          totalProductsSynced++;
        } catch (productError) {
          console.error('[Sync Products] Error processing product:', metaProduct.name, productError);
          throw productError;
        }
      }
    }

    // Update sync timestamp in platform connection
    const { error: updateError } = await supabase
      .from('platform_connections')
      .update({
        metadata: {
          ...connection.metadata,
          last_product_sync_at: new Date().toISOString(),
        },
      })
      .eq('id', connection.id);

    if (updateError) {
      console.error('[Sync Products] Error updating sync timestamp:', updateError);
    }

    console.log('[Sync Products] Sync completed successfully. Total synced:', totalProductsSynced);

    return NextResponse.json(
      {
        success: true,
        syncedCount: totalProductsSynced,
        message: `Successfully synced ${totalProductsSynced} products from Instagram`,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to sync products';
    console.error('[Sync Products] Fatal error:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
