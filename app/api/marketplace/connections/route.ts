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

    // Get all platform connections
    const { data: connections, error } = await supabase
      .from("platform_connections")
      .select("*")
      .eq("seller_id", seller.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch connections:", error);
      return NextResponse.json(
        { error: "Failed to fetch connections" },
        { status: 500 }
      );
    }

    // Get sync logs for each platform to show recent sync status
    const platforms = ['tiktok', 'whatnot', 'meta'];
    const syncStatuses: Record<string, any> = {};

    for (const platform of platforms) {
      const { data: recentSync } = await supabase
        .from(`${platform}_sync_logs`)
        .select("*")
        .eq("seller_id", seller.id)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentSync) {
        syncStatuses[platform] = recentSync;
      }
    }

    return NextResponse.json({
      connections: connections || [],
      syncStatuses,
    });
  } catch (error) {
    console.error("Get connections error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
