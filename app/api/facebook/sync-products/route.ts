import { createAdminSupabase } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';
import { fetchUserBusinesses, fetchOwnedCatalogs, fetchCatalogProducts } from '@/lib/meta-service';
import { verifyJWT, extractToken } from '@/lib/jwt';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    console.log('[Sync Products] Starting sync');
    
    // Get JWT token from headers
    const token = extractToken(request.headers);
    
    if (!token) {
      console.log('[Sync Products] No JWT token found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('[Sync Products] Verifying JWT token');
    const payload = await verifyJWT(token);
    
    if (!payload) {
      console.log('[Sync Products] Invalid JWT token');
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    console.log('[Sync Products] JWT token verified, userId:', payload.userId);
    const sellerId = payload.userId;

    const supabase = createAdminSupabase();

    // Get Meta connection (check both meta and facebook for backward compatibility)
    const { data: connection, error: connError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('seller_id', sellerId)
      .or('platform.eq.meta,platform.eq.facebook')
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
        { error: 'Meta connection not found. Please connect your Meta account first.' },
        { status: 404 }
      );
    }

    // Get access token from connection or metadata
    const accessToken = connection.access_token || connection.metadata?.access_token;
    
    if (!accessToken) {
      console.error('[Sync Products] Connection exists but no access token in either field');
      return NextResponse.json(
        { error: 'Meta access token missing. Please reconnect your Meta account.' },
        { status: 400 }
      );
    }

    // Fetch Facebook user businesses
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
            error: 'Meta token invalid or expired. Please disconnect and reconnect your Meta account.',
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
            error: 'Meta token invalid or expired. Please disconnect and reconnect your Meta account.',
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
          // Check if product already exists for this seller with same SKU (if available) or name
          const { data: existingProduct } = await supabase
            .from('products')
            .select('id')
            .eq('seller_id', sellerId)
            .or(`sku.eq.${metaProduct.sku || ''},name.eq.${metaProduct.name || 'Untitled'}`)
            .maybeSingle();

          const productData: any = {
            seller_id: sellerId,
            name: metaProduct.name || 'Untitled',
            description: metaProduct.description || '',
            price: (metaProduct.price != null && !isNaN(parseFloat(String(metaProduct.price)))) ? parseFloat(String(metaProduct.price)) : 0,
            category: metaProduct.category || 'Other',
            stock_quantity: metaProduct.stock || 0,
            images: metaProduct.imageUrl ? [metaProduct.imageUrl] : [],
            status: metaProduct.status || 'active' as const,
            source_platform: 'meta',
            sku: metaProduct.sku || null,
            metadata: {
              meta_product_id: metaProduct.id,
              meta_catalog_id: catalog.id,
            },
          };

          let productId: string;
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
            productId = existingProduct.id;
          } else {
            // Insert new product
            const { data: newProduct, error: insertError } = await supabase.from('products').insert(productData).select('id').single();
            if (insertError) {
              console.error('[Sync Products] Error inserting product:', JSON.stringify(insertError));
              console.error('[Sync Products] Product data being inserted:', JSON.stringify(productData));
              throw new Error(`Database insert error: ${insertError.message || JSON.stringify(insertError)}`);
            }
            productId = newProduct.id;
          }

          // Save to meta_products table (if it exists)
          try {
            const metaProductData = {
              seller_id: sellerId,
              product_id: productId,
              meta_product_id: metaProduct.id,
              meta_catalog_id: catalog.id,
              title: metaProduct.name,
              description: metaProduct.description,
              price: metaProduct.price,
              availability: metaProduct.availability,
              retailer_id: metaProduct.retailer_id,
              retailer_price: metaProduct.retailer_price,
              images: metaProduct.imageUrl ? [metaProduct.imageUrl] : [],
              variants: metaProduct.variants || [],
              sync_status: 'synced' as const,
              last_sync_at: new Date().toISOString(),
              metadata: metaProduct.raw,
            };

            const { data: existingMetaProduct } = await supabase
              .from('meta_products')
              .select('id')
              .eq('seller_id', sellerId)
              .eq('meta_product_id', metaProduct.id)
              .maybeSingle();

            if (existingMetaProduct) {
              const { error: metaUpdateError } = await supabase
                .from('meta_products')
                .update(metaProductData)
                .eq('id', existingMetaProduct.id);
              if (metaUpdateError) {
                console.error('[Sync Products] Error updating meta product:', metaUpdateError);
              }
            } else {
              const { error: metaInsertError } = await supabase.from('meta_products').insert(metaProductData);
              if (metaInsertError) {
                console.error('[Sync Products] Error inserting meta product:', metaInsertError);
              }
            }
          } catch (metaError) {
            // If meta_products table doesn't exist yet, skip this step
            console.log('[Sync Products] meta_products table not available yet, skipping meta product sync');
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
        message: `Successfully synced ${totalProductsSynced} products from Meta Commerce Shop`,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to sync products';
    const stack = error instanceof Error ? error.stack : undefined;
    console.error('[Sync Products] Fatal error:', error);
    return NextResponse.json(
      { error: message, details: stack },
      { status: 500 }
    );
  }
}
