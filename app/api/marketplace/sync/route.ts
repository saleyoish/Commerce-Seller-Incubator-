import { createServerSideSupabase } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { platform, syncType = "pull" } = body;

    if (!platform) {
      return NextResponse.json(
        { error: "Platform is required" },
        { status: 400 }
      );
    }

    const validPlatforms = ['tiktok', 'whatnot', 'meta'];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: "Invalid platform" },
        { status: 400 }
      );
    }

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

    // Check if connection exists and is active
    const { data: connection } = await supabase
      .from("platform_connections")
      .select("*")
      .eq("seller_id", seller.id)
      .eq("platform", platform)
      .single();

    if (!connection || connection.status !== 'connected') {
      return NextResponse.json(
        { error: `${platform} is not connected` },
        { status: 400 }
      );
    }

    // Trigger sync for the platform
    const syncUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/${platform}/sync-products?sellerId=${seller.id}&syncType=${syncType}`;
    
    const response = await fetch(syncUrl, {
      method: "POST",
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || "Sync failed" },
        { status: response.status }
      );
    }

    const syncResult = await response.json();

    return NextResponse.json({
      success: true,
      platform,
      syncType,
      ...syncResult,
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
