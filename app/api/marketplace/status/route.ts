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

    // Get connection status for all platforms
    const platforms = ['tiktok', 'whatnot', 'meta'];
    const statuses: Record<string, any> = {};

    for (const platform of platforms) {
      const { data: connection } = await supabase
        .from("platform_connections")
        .select("*")
        .eq("seller_id", seller.id)
        .eq("platform", platform)
        .maybeSingle();

      // Get recent sync log
      const { data: recentSync } = await supabase
        .from(`${platform}_sync_logs`)
        .select("*")
        .eq("seller_id", seller.id)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get product count for this platform
      const { count } = await supabase
        .from(`${platform}_products`)
        .select("*", { count: "exact", head: true })
        .eq("seller_id", seller.id);

      statuses[platform] = {
        connected: connection?.status === 'connected',
        status: connection?.status || 'disconnected',
        connectedAt: connection?.connected_at,
        lastSyncAt: connection?.last_product_sync_at,
        lastSyncStatus: recentSync?.status,
        lastSyncTime: recentSync?.started_at,
        productCount: count || 0,
        platformUsername: connection?.platform_username,
        syncEnabled: connection?.sync_enabled ?? true,
      };
    }

    return NextResponse.json({ statuses });
  } catch (error) {
    console.error("Get status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
