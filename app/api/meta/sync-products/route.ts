import { fetchCatalogProducts, updateCatalogProduct } from "@/lib/meta-service";
import { verifyJWT, extractToken } from "@/lib/jwt";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get("sellerId");
    const syncType = searchParams.get("syncType") || "pull"; // "pull" (Meta -> local) or "push" (local -> Meta)

    if (!sellerId) {
      return NextResponse.json(
        { error: "Missing sellerId" },
        { status: 400 }
      );
    }

    // Get JWT token from headers
    const token = extractToken(request.headers);

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const payload = await verifyJWT(token);

    if (!payload || payload.userId !== sellerId) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    // Get seller's Meta connection
    const { data: connection, error: connectionError } = await db
      .from("platform_connections")
      .select("*")
      .eq("seller_id", sellerId)
      .eq("platform", "meta")
      .single();

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: "No active Meta connection" },
        { status: 400 }
      );
    }

    const metadata = connection.metadata || {};
    const catalogId = metadata.selectedCatalogId;
    const accessToken = connection.access_token;

    if (!catalogId) {
      return NextResponse.json(
        { error: "No catalog selected for Meta connection" },
        { status: 400 }
      );
    }

    // Create sync log entry
    const { data: syncLogData, error: syncLogError } = await db
      .from("meta_sync_logs")
      .insert({
        seller_id: sellerId,
        sync_type: syncType === "pull" ? "product_pull" : "product_push",
        status: "started",
        items_total: 0,
      })
      .select("id");

    const syncLog = Array.isArray(syncLogData) ? syncLogData[0] : syncLogData;
    let syncLogId: string | null = null;

    if (syncLogError || !syncLog || !syncLog.id) {
      console.warn("Sync log creation skipped:", {
        error: syncLogError?.message || 'Missing meta_sync_logs table',
        syncLogData,
      });
    } else {
      syncLogId = syncLog.id;
    }

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];
    let itemsTotal = 0;

    if (syncType === "pull") {
      // Pull products from Meta to local database
      try {
        console.log('[Meta Sync] Starting product pull from catalog:', catalogId);
        const metaProducts = await fetchCatalogProducts(catalogId, accessToken);
        console.log('[Meta Sync] Retrieved', metaProducts.length, 'products from Meta');
        itemsTotal = metaProducts.length;

        for (const metaProduct of metaProducts) {
          try {
            // Use retailer_id if available, otherwise use Meta product ID
            const metaSku = metaProduct.retailer_id || metaProduct.id;

            // Check if product already exists locally via SKU or Meta mapping
            const { data: existingProductBySku } = await db
              .from("products")
              .select("id")
              .eq("seller_id", sellerId)
              .eq("sku", metaSku)
              .maybeSingle();

            const { data: existingMetaProduct } = await db
              .from("meta_products")
              .select("*")
              .eq("seller_id", sellerId)
              .eq("meta_product_id", metaProduct.id)
              .maybeSingle();

            const productData = {
              seller_id: sellerId,
              name: metaProduct.name || 'Untitled Product',
              description: metaProduct.description || '',
              price: metaProduct.price || 0,
              category: metaProduct.category || 'Other',
              stock_quantity: metaProduct.stock || 0,
              images: metaProduct.imageUrl ? [metaProduct.imageUrl] : [],
              sku: metaSku,
              status: "active",
              source_platform: "meta",
              availability: metaProduct.availability || 'in_stock',
              sale_price: metaProduct.sale_price || null,
              variants: metaProduct.variants || [],
              updated_at: new Date().toISOString(),
            };

            if (existingProductBySku) {
              // Update existing local product by SKU
              await db
                .from("products")
                .update(productData)
                .eq("id", existingProductBySku.id);

              // Update or create Meta mapping
              if (existingMetaProduct) {
                await db
                  .from("meta_products")
                  .update({
                    product_id: existingProductBySku.id,
                    meta_sku: metaSku,
                    title: metaProduct.name,
                    description: metaProduct.description,
                    price: metaProduct.price,
                    retailer_price: metaProduct.retailer_price,
                    availability: metaProduct.availability,
                    images: metaProduct.imageUrl ? [metaProduct.imageUrl] : [],
                    variants: metaProduct.variants || [],
                    sync_status: "synced",
                    last_sync_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  })
                  .eq("meta_product_id", metaProduct.id);
              } else {
                await db.from("meta_products").insert({
                  seller_id: sellerId,
                  product_id: existingProductBySku.id,
                  meta_product_id: metaProduct.id,
                  meta_catalog_id: catalogId,
                  meta_sku: metaSku,
                  title: metaProduct.name,
                  description: metaProduct.description,
                  price: metaProduct.price,
                  retailer_price: metaProduct.retailer_price,
                  availability: metaProduct.availability,
                  images: metaProduct.imageUrl ? [metaProduct.imageUrl] : [],
                  variants: metaProduct.variants || [],
                  sync_status: "synced",
                  last_sync_at: new Date().toISOString(),
                });
              }
            } else if (existingMetaProduct?.product_id) {
              // Update the local product and mapping when the product is already linked
              await db
                .from("products")
                .update(productData)
                .eq("id", existingMetaProduct.product_id);

              await db
                .from("meta_products")
                .update({
                  title: metaProduct.name,
                  description: metaProduct.description,
                  price: metaProduct.price,
                  retailer_price: metaProduct.retailer_price,
                  availability: metaProduct.availability,
                  images: metaProduct.imageUrl ? [metaProduct.imageUrl] : [],
                  variants: metaProduct.variants || [],
                  meta_sku: metaSku,
                  sync_status: "synced",
                  last_sync_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq("meta_product_id", metaProduct.id);
            } else if (existingMetaProduct && !existingMetaProduct.product_id) {
              // If the mapping exists without a linked product, create a local product
              const { data: newProduct, error: newProductError } = await db
                .from("products")
                .insert(productData)
                .select()
                .single();

              if (newProductError || !newProduct || !newProduct.id) {
                throw new Error(newProductError?.message || 'Failed to create local product');
              }

              await db
                .from("meta_products")
                .update({
                  product_id: newProduct.id,
                  meta_sku: metaSku,
                  title: metaProduct.name,
                  description: metaProduct.description,
                  price: metaProduct.price,
                  retailer_price: metaProduct.retailer_price,
                  availability: metaProduct.availability,
                  images: metaProduct.imageUrl ? [metaProduct.imageUrl] : [],
                  variants: metaProduct.variants || [],
                  sync_status: "synced",
                  last_sync_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq("meta_product_id", metaProduct.id);
            } else {
              // Create new local product and mapping
              const { data: newProduct, error: newProductError } = await db
                .from("products")
                .insert(productData)
                .select()
                .single();

              if (newProductError || !newProduct || !newProduct.id) {
                throw new Error(newProductError?.message || 'Failed to create local product');
              }

              await db.from("meta_products").insert({
                seller_id: sellerId,
                product_id: newProduct.id,
                meta_product_id: metaProduct.id,
                meta_catalog_id: catalogId,
                meta_sku: metaSku,
                title: metaProduct.name,
                description: metaProduct.description,
                price: metaProduct.price,
                retailer_price: metaProduct.retailer_price,
                availability: metaProduct.availability,
                images: metaProduct.imageUrl ? [metaProduct.imageUrl] : [],
                variants: metaProduct.variants || [],
                sync_status: "synced",
                last_sync_at: new Date().toISOString(),
              });
            }

            successCount++;
          } catch (error) {
            failCount++;
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            errors.push(`Meta product ${metaProduct.id}: ${errorMessage}`);
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error('[Meta Sync Error] Failed to fetch products:', errorMessage);
        errors.push(`Failed to fetch Meta products: ${errorMessage}`);
      }
    } else {
      // Push local products to Meta
      const { data: products, error: productsError } = await db
        .from("products")
        .select("*")
        .eq("seller_id", sellerId)
        .eq("status", "active")
        .gt("stock_quantity", 0);

      if (productsError) {
        return NextResponse.json(
          { error: "Failed to fetch products" },
          { status: 500 }
        );
      }

      itemsTotal = products?.length || 0;

      // Sync each product
      for (const product of products || []) {
        try {
          // Use SKU if available, otherwise use product ID
          const sellerSku = (product as any).sku || product.id;

          // Check if product already synced
          const { data: existingMetaProduct } = await db
            .from("meta_products")
            .select("meta_product_id")
            .eq("product_id", product.id)
            .single();

          if (existingMetaProduct?.meta_product_id) {
            // Update existing product on Meta
            await updateCatalogProduct(
              catalogId,
              existingMetaProduct.meta_product_id,
              accessToken,
              {
                name: product.name,
                description: product.description || "",
                price: product.price,
                availability: product.stock_quantity > 0 ? "in_stock" : "out_of_stock",
                category: product.category,
              }
            );

            await db
              .from("meta_products")
              .update({
                title: product.name,
                description: product.description,
                price: product.price,
                availability: product.stock_quantity > 0 ? "in_stock" : "out_of_stock",
                images: product.images || [],
                meta_sku: sellerSku,
                sync_status: "synced",
                last_sync_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("product_id", product.id);
          } else {
            // For Meta, we need to create products via their catalog batch API
            // This is a simplified version - in production, you'd use the batch API
            console.log('[Meta Sync] Product creation via batch API needed for:', product.id);
            
            // Record the mapping as pending
            await db.from("meta_products").insert({
              seller_id: sellerId,
              product_id: product.id,
              meta_catalog_id: catalogId,
              meta_sku: sellerSku,
              title: product.name,
              description: product.description,
              price: product.price,
              availability: product.stock_quantity > 0 ? "in_stock" : "out_of_stock",
              images: product.images || [],
              sync_status: "pending",
              last_sync_at: new Date().toISOString(),
            });
          }

          successCount++;
        } catch (error) {
          failCount++;
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          errors.push(`Product ${product.id}: ${errorMessage}`);

          // Update product sync status to failed
          await db
            .from("meta_products")
            .upsert({
              seller_id: sellerId,
              product_id: product.id,
              sync_status: "failed",
              sync_error: errorMessage,
              updated_at: new Date().toISOString(),
            }, { onConflict: "seller_id,product_id" });
        }
      }
    }

    // Update sync log if we were able to create one
    if (syncLogId) {
      await db
        .from("meta_sync_logs")
        .update({
          status: failCount > 0 ? "failed" : "completed",
          items_total: itemsTotal,
          items_success: successCount,
          items_failed: failCount,
          completed_at: new Date().toISOString(),
          error_message: errors.length > 0 ? errors.join("\n") : null,
        })
        .eq("id", syncLogId);
    }

    // Update last sync time on connection
    await db
      .from("platform_connections")
      .update({
        last_product_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);

    return NextResponse.json({
      success: true,
      syncLogId,
      syncType,
      total: itemsTotal,
      successCount,
      failed: failCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Meta product sync error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
