import { createAdminSupabase } from "@/lib/supabase-admin";
import { createWhatnotProduct, updateWhatnotProduct, listWhatnotProducts, mapCategoryToWhatnot } from "@/lib/whatnot-api";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get("sellerId");
    const syncType = searchParams.get("syncType") || "push"; // "push" (local -> Whatnot) or "pull" (Whatnot -> local)

    if (!sellerId) {
      return NextResponse.json(
        { error: "Missing sellerId" },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabase();

    // Get seller's Whatnot connection
    const { data: connection, error: connectionError } = await supabase
      .from("platform_connections")
      .select("*")
      .eq("seller_id", sellerId)
      .eq("platform", "whatnot")
      .single();

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: "No active Whatnot connection" },
        { status: 400 }
      );
    }

    // Create sync log entry
    const { data: syncLogData, error: syncLogError } = await supabase
      .from("whatnot_sync_logs")
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
        error: syncLogError?.message || 'Missing whatnot_sync_logs table',
        syncLogData,
      });
    } else {
      syncLogId = syncLog.id;
    }
    const metadata = connection.metadata || {};
    const accessToken = connection.access_token || metadata.access_token || 'demo_token';

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];
    let itemsTotal = 0;

    if (syncType === "pull") {
      // Pull products from Whatnot to local database
      try {
        console.log('[Whatnot Sync] Starting product pull with token:', accessToken?.substring(0, 10) + '...');
        const { products: whatnotProducts } = await listWhatnotProducts(accessToken);
        console.log('[Whatnot Sync] Retrieved', whatnotProducts.length, 'products from Whatnot');
        itemsTotal = whatnotProducts.length;

        for (const whatnotProduct of whatnotProducts) {
          try {
            // Use SKU if available from Whatnot, otherwise use Whatnot product ID
            const whatnotSku = whatnotProduct.sku || whatnotProduct.id;

            // Check if product already exists locally via SKU or Whatnot mapping
            const { data: existingProductBySku } = await supabase
              .from("products")
              .select("id")
              .eq("seller_id", sellerId)
              .eq("sku", whatnotSku)
              .maybeSingle();

            const { data: existingWhatnotProduct } = await supabase
              .from("whatnot_products")
              .select("*")
              .eq("seller_id", sellerId)
              .eq("whatnot_product_id", whatnotProduct.id)
              .maybeSingle();

            if (existingProductBySku) {
              // Update existing local product by SKU
              await supabase
                .from("products")
                .update({
                  name: whatnotProduct.title,
                  description: whatnotProduct.description,
                  price: whatnotProduct.price,
                  category: mapWhatnotCategoryToLocal(whatnotProduct.category),
                  stock_quantity: whatnotProduct.quantity,
                  images: whatnotProduct.images,
                  sku: whatnotSku,
                  status: "active",
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existingProductBySku.id);

              // Update or create Whatnot mapping
              if (existingWhatnotProduct) {
                await supabase
                  .from("whatnot_products")
                  .update({
                    product_id: existingProductBySku.id,
                    whatnot_sku: whatnotSku,
                    title: whatnotProduct.title,
                    description: whatnotProduct.description,
                    price: whatnotProduct.price,
                    quantity: whatnotProduct.quantity,
                    category: whatnotProduct.category,
                    images: whatnotProduct.images,
                    sync_status: "synced",
                    last_sync_at: new Date().toISOString(),
                    whatnot_updated_at: whatnotProduct.metadata?.updated_at || new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  })
                  .eq("whatnot_product_id", whatnotProduct.id);
              } else {
                await supabase.from("whatnot_products").insert({
                  seller_id: sellerId,
                  product_id: existingProductBySku.id,
                  whatnot_product_id: whatnotProduct.id,
                  whatnot_sku: whatnotSku,
                  title: whatnotProduct.title,
                  description: whatnotProduct.description,
                  price: whatnotProduct.price,
                  quantity: whatnotProduct.quantity,
                  category: whatnotProduct.category,
                  images: whatnotProduct.images,
                  sync_status: "synced",
                  last_sync_at: new Date().toISOString(),
                  whatnot_created_at: whatnotProduct.metadata?.created_at || new Date().toISOString(),
                });
              }
            } else if (existingWhatnotProduct?.product_id) {
              // Update the local product and mapping when the product is already linked
              await supabase
                .from("products")
                .update({
                  name: whatnotProduct.title,
                  description: whatnotProduct.description,
                  price: whatnotProduct.price,
                  category: mapWhatnotCategoryToLocal(whatnotProduct.category),
                  stock_quantity: whatnotProduct.quantity,
                  images: whatnotProduct.images,
                  sku: whatnotSku,
                  status: "active",
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existingWhatnotProduct.product_id);

              await supabase
                .from("whatnot_products")
                .update({
                  title: whatnotProduct.title,
                  description: whatnotProduct.description,
                  price: whatnotProduct.price,
                  quantity: whatnotProduct.quantity,
                  category: whatnotProduct.category,
                  images: whatnotProduct.images,
                  whatnot_sku: whatnotSku,
                  sync_status: "synced",
                  last_sync_at: new Date().toISOString(),
                  whatnot_updated_at: whatnotProduct.metadata?.updated_at || new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq("whatnot_product_id", whatnotProduct.id);
            } else if (existingWhatnotProduct && !existingWhatnotProduct.product_id) {
              // If the mapping exists without a linked product, create or reuse a local product
              const { data: newProduct, error: newProductError } = await supabase
                .from("products")
                .insert({
                  seller_id: sellerId,
                  name: whatnotProduct.title,
                  description: whatnotProduct.description,
                  price: whatnotProduct.price,
                  category: mapWhatnotCategoryToLocal(whatnotProduct.category),
                  stock_quantity: whatnotProduct.quantity,
                  images: whatnotProduct.images,
                  sku: whatnotSku,
                  status: "active",
                })
                .select()
                .single();

              if (newProductError || !newProduct || !newProduct.id) {
                throw new Error(newProductError?.message || 'Failed to create local product');
              }

              await supabase
                .from("whatnot_products")
                .update({
                  product_id: newProduct.id,
                  whatnot_sku: whatnotSku,
                  title: whatnotProduct.title,
                  description: whatnotProduct.description,
                  price: whatnotProduct.price,
                  quantity: whatnotProduct.quantity,
                  category: whatnotProduct.category,
                  images: whatnotProduct.images,
                  sync_status: "synced",
                  last_sync_at: new Date().toISOString(),
                  whatnot_updated_at: whatnotProduct.metadata?.updated_at || new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq("whatnot_product_id", whatnotProduct.id);
            } else {
              // Create new local product and mapping
              const { data: newProduct, error: newProductError } = await supabase
                .from("products")
                .insert({
                  seller_id: sellerId,
                  name: whatnotProduct.title,
                  description: whatnotProduct.description,
                  price: whatnotProduct.price,
                  category: mapWhatnotCategoryToLocal(whatnotProduct.category),
                  stock_quantity: whatnotProduct.quantity,
                  images: whatnotProduct.images,
                  sku: whatnotSku,
                  status: "active",
                })
                .select()
                .single();

              if (newProductError || !newProduct || !newProduct.id) {
                throw new Error(newProductError?.message || 'Failed to create local product');
              }

              await supabase.from("whatnot_products").insert({
                seller_id: sellerId,
                product_id: newProduct.id,
                whatnot_product_id: whatnotProduct.id,
                whatnot_sku: whatnotSku,
                title: whatnotProduct.title,
                description: whatnotProduct.description,
                price: whatnotProduct.price,
                quantity: whatnotProduct.quantity,
                category: whatnotProduct.category,
                images: whatnotProduct.images,
                sync_status: "synced",
                last_sync_at: new Date().toISOString(),
                whatnot_created_at: whatnotProduct.metadata?.created_at || new Date().toISOString(),
              });
            }

            successCount++;
          } catch (error) {
            failCount++;
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            errors.push(`Whatnot product ${whatnotProduct.id}: ${errorMessage}`);
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error('[Whatnot Sync Error] Failed to fetch products:', errorMessage);
        errors.push(`Failed to fetch Whatnot products: ${errorMessage}`);
      }
    } else {
      // Push local products to Whatnot
      const { data: products, error: productsError } = await supabase
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
          const { data: existingWhatnotProduct } = await supabase
            .from("whatnot_products")
            .select("whatnot_product_id")
            .eq("product_id", product.id)
            .single();

          if (existingWhatnotProduct?.whatnot_product_id) {
            // Update existing product on Whatnot
            await updateWhatnotProduct(accessToken, existingWhatnotProduct.whatnot_product_id, {
              title: product.name,
              description: product.description || "",
              category: mapCategoryToWhatnot(product.category),
              price: product.price,
              quantity: product.stock_quantity,
              images: product.images || [],
            });

            await supabase
              .from("whatnot_products")
              .update({
                title: product.name,
                description: product.description,
                price: product.price,
                quantity: product.stock_quantity,
                category: product.category,
                images: product.images,
                whatnot_sku: sellerSku,
                sync_status: "synced",
                last_sync_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("product_id", product.id);
          } else {
            // Create new product on Whatnot
            const whatnotProductId = await createWhatnotProduct(accessToken, {
              title: product.name,
              description: product.description || "",
              category: mapCategoryToWhatnot(product.category),
              price: product.price,
              quantity: product.stock_quantity,
              images: product.images || [],
            });

            // Record the mapping
            await supabase.from("whatnot_products").insert({
              seller_id: sellerId,
              product_id: product.id,
              whatnot_product_id: whatnotProductId,
              whatnot_sku: sellerSku,
              title: product.name,
              description: product.description,
              price: product.price,
              quantity: product.stock_quantity,
              category: product.category,
              images: product.images,
              sync_status: "synced",
              last_sync_at: new Date().toISOString(),
              whatnot_created_at: new Date().toISOString(),
            });
          }

          successCount++;
        } catch (error) {
          failCount++;
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          errors.push(`Product ${product.id}: ${errorMessage}`);

          // Update product sync status to failed
          await supabase
            .from("whatnot_products")
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
      await supabase
        .from("whatnot_sync_logs")
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
    await supabase
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
    console.error("Product sync error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to map Whatnot categories to local categories
function mapWhatnotCategoryToLocal(category: string): string {
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
