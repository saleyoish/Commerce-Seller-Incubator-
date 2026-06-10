import { createServerSideSupabase } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
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
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!seller) {
      return NextResponse.json({ error: "Seller not found" }, { status: 404 });
    }

    // Get product stats
    const { data: productStats } = await supabase
      .from("tiktok_products")
      .select("sync_status")
      .eq("seller_id", seller.id);

    const totalProducts = productStats?.length || 0;
    const syncedProducts =
      productStats?.filter((p) => p.sync_status === "synced").length || 0;
    const failedProducts =
      productStats?.filter((p) => p.sync_status === "failed").length || 0;

    // Get order stats
    const { data: allOrders } = await supabase
      .from("tiktok_orders")
      .select("order_status, created_at")
      .eq("seller_id", seller.id);

    const totalOrders = allOrders?.length || 0;

    // Orders in last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const recentOrders =
      allOrders?.filter(
        (o) => new Date(o.created_at) > oneDayAgo
      ).length || 0;

    // Pending orders
    const pendingOrders =
      allOrders?.filter(
        (o) =>
          o.order_status === "unpaid" || o.order_status === "awaiting_shipment"
      ).length || 0;

    return NextResponse.json({
      totalProducts,
      syncedProducts,
      failedProducts,
      totalOrders,
      recentOrders,
      pendingOrders,
    });
  } catch (error) {
    console.error("Get stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
