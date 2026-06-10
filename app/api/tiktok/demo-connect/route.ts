import { createServerSideSupabase } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = await createServerSideSupabase();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get seller
    const { data: seller } = await supabase
      .from("sellers")
      .select("id, email")
      .eq("user_id", user.id)
      .single();

    if (!seller) {
      return NextResponse.json({ error: "Seller not found" }, { status: 404 });
    }

    // Check if connection already exists
    const { data: existingConnection } = await supabase
      .from("tiktok_shop_connections")
      .select("id")
      .eq("seller_id", seller.id)
      .single();

    const demoShopId = `demo_${seller.id.substring(0, 8)}`;

    if (existingConnection) {
      // Update existing connection to demo mode
      const { error: updateError } = await supabase
        .from("tiktok_shop_connections")
        .update({
          tiktok_shop_id: demoShopId,
          shop_name: `${seller.email}'s Demo Shop`,
          shop_region: "US",
          shop_status: "active",
          is_connected: true,
          connected_at: new Date().toISOString(),
          scopes: ["product", "order", "demo"],
          access_token: "demo_token",
          refresh_token: "demo_refresh",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingConnection.id);

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to update demo connection" },
          { status: 500 }
        );
      }
    } else {
      // Create new demo connection
      const { error: insertError } = await supabase
        .from("tiktok_shop_connections")
        .insert({
          seller_id: seller.id,
          tiktok_shop_id: demoShopId,
          shop_name: `${seller.email}'s Demo Shop`,
          shop_region: "US",
          shop_status: "active",
          is_connected: true,
          connected_at: new Date().toISOString(),
          scopes: ["product", "order", "demo"],
          access_token: "demo_token",
          refresh_token: "demo_refresh",
        });

      if (insertError) {
        return NextResponse.json(
          { error: "Failed to create demo connection" },
          { status: 500 }
        );
      }
    }

    // Create some demo products if none exist
    const { data: existingProducts } = await supabase
      .from("tiktok_products")
      .select("id")
      .eq("seller_id", seller.id)
      .limit(1);

    if (!existingProducts || existingProducts.length === 0) {
      // Get seller's actual products to create demo mappings
      const { data: products } = await supabase
        .from("products")
        .select("id, name, stock_quantity")
        .eq("seller_id", seller.id)
        .eq("status", "active")
        .limit(5);

      if (products && products.length > 0) {
        // Create demo TikTok product mappings
        const demoProducts = products.map((p, index) => ({
          seller_id: seller.id,
          product_id: p.id,
          tiktok_product_id: `tiktok_${p.id.substring(0, 8)}`,
          sku: p.id,
          sync_status: "synced",
          tiktok_status: "active",
          last_sync_at: new Date().toISOString(),
        }));

        await supabase.from("tiktok_products").insert(demoProducts);
      }

      // Create demo orders
      const demoOrders = [
        {
          seller_id: seller.id,
          tiktok_order_id: `ORDER_${Date.now()}_1`,
          order_status: "completed",
          buyer_info: { name: "Demo Customer", email: "demo@test.com" },
          items: [{ product_name: "Demo Product 1", quantity: 2, price: "29.99" }],
          subtotal: 59.98,
          shipping_cost: 5.0,
          tax_amount: 4.8,
          discount_amount: 0,
          total_amount: 69.78,
          seller_earnings: 55.82, // 80%
          currency: "USD",
          created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        },
        {
          seller_id: seller.id,
          tiktok_order_id: `ORDER_${Date.now()}_2`,
          order_status: "awaiting_shipment",
          buyer_info: { name: "Demo Customer 2", email: "demo2@test.com" },
          items: [{ product_name: "Demo Product 2", quantity: 1, price: "49.99" }],
          subtotal: 49.99,
          shipping_cost: 5.0,
          tax_amount: 4.4,
          discount_amount: 5.0,
          total_amount: 54.39,
          seller_earnings: 43.51, // 80%
          currency: "USD",
          created_at: new Date().toISOString(),
        },
      ];

      await supabase.from("tiktok_orders").insert(demoOrders);
    }

    return NextResponse.json({
      success: true,
      demoMode: true,
      message: "Demo TikTok Shop connected successfully",
    });
  } catch (error) {
    console.error("Demo connect error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
