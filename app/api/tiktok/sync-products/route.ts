import { createAdminSupabase } from "@/lib/supabase-admin";
import { createTikTokProduct, updateTikTokProduct, listTikTokProducts } from "@/lib/tiktok-api";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get("sellerId");

    if (!sellerId) {
      return NextResponse.json(
        { error: "Missing sellerId" },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabase();

    // Get seller's TikTok connection
    const { data: connection, error: connectionError } = await supabase
      .from("tiktok_shop_connections")
      .select("*")
      .eq("seller_id", sellerId)
      .eq("is_connected", true)
      .single();

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: "No active TikTok Shop connection" },
        { status: 400 }
      );
    }

    // Get seller's products that need syncing
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

    // Create sync log entry
    const { data: syncLog } = await supabase
      .from("tiktok_sync_logs")
      .insert({
        seller_id: sellerId,
        sync_type: "product_push",
        status: "started",
        items_total: products?.length || 0,
      })
      .select()
      .single();

    const syncLogId = syncLog.id;

    // Demo mode - just update sync timestamps
    if (connection.access_token === "demo_token") {
      // Update sync log
      await supabase
        .from("tiktok_sync_logs")
        .update({
          status: "completed",
          items_success: products?.length || 0,
          completed_at: new Date().toISOString(),
        })
        .eq("id", syncLogId);

      // Update last sync time
      await supabase
        .from("tiktok_shop_connections")
        .update({
          last_product_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", connection.id);

      return NextResponse.json({
        success: true,
        demoMode: true,
        syncLogId,
        total: products?.length || 0,
        successCount: products?.length || 0,
        failed: 0,
        message: "Demo mode: Products sync simulated",
      });
    }

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    // Sync each product
    for (const product of products || []) {
      try {
        // Use SKU if available, otherwise use product ID
        const sellerSku = (product as any).sku || product.id;

        // Check if product already synced
        const { data: existingTikTokProduct } = await supabase
          .from("tiktok_products")
          .select("tiktok_product_id")
          .eq("product_id", product.id)
          .single();

        if (existingTikTokProduct?.tiktok_product_id) {
          // Update existing product
          await updateTikTokProduct(connection.access_token, existingTikTokProduct.tiktok_product_id, {
            title: product.name,
            description: product.description || "",
            skus: [{
              seller_sku: sellerSku,
              price: {
                amount: product.price.toString(),
                currency: "USD",
              },
              quantity: product.stock_quantity,
            }],
          });

          await supabase
            .from("tiktok_products")
            .update({
              sync_status: "synced",
              sku: sellerSku,
              last_sync_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("product_id", product.id);
        } else {
          // Create new product
          const tiktokProductId = await createTikTokProduct(connection.access_token, {
            title: product.name,
            description: product.description || "",
            category_id: mapCategoryToTikTok(product.category),
            images: product.images || [],
            skus: [{
              seller_sku: sellerSku,
              price: {
                amount: product.price.toString(),
                currency: "USD",
              },
              quantity: product.stock_quantity,
            }],
          });

          // Record the mapping
          await supabase.from("tiktok_products").insert({
            seller_id: sellerId,
            product_id: product.id,
            tiktok_product_id: tiktokProductId,
            sku: sellerSku,
            sync_status: "synced",
            last_sync_at: new Date().toISOString(),
          });
        }

        successCount++;
      } catch (error) {
        failCount++;
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        errors.push(`Product ${product.id}: ${errorMessage}`);

        // Update product sync status to failed
        await supabase
          .from("tiktok_products")
          .upsert({
            seller_id: sellerId,
            product_id: product.id,
            sync_status: "failed",
            sync_error: errorMessage,
            updated_at: new Date().toISOString(),
          }, { onConflict: "seller_id,product_id" });
      }
    }

    // Update sync log
    await supabase
      .from("tiktok_sync_logs")
      .update({
        status: failCount > 0 ? "failed" : "completed",
        items_success: successCount,
        items_failed: failCount,
        completed_at: new Date().toISOString(),
        error_message: errors.length > 0 ? errors.join("\n") : null,
      })
      .eq("id", syncLogId);

    // Update last sync time on connection
    await supabase
      .from("tiktok_shop_connections")
      .update({
        last_product_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);

    return NextResponse.json({
      success: true,
      syncLogId,
      total: products.length,
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

// Helper function to map our categories to TikTok category IDs
function mapCategoryToTikTok(category: string): string {
  const categoryMap: Record<string, string> = {
    Fashion: "600001",
    Beauty: "600002",
    Electronics: "600003",
    Home: "600004",
    Sports: "600005",
    Toys: "600006",
    Health: "600007",
    Other: "600000",
  };

  return categoryMap[category] || "600000";
}
