import { createServerSideSupabase } from "@/lib/supabase-server";
import { refreshPlatformToken } from "@/lib/token-refresh";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { platform } = body;

    if (!platform) {
      return NextResponse.json(
        { error: "Platform is required" },
        { status: 400 }
      );
    }

    const validPlatforms = ['tiktok', 'whatnot', 'meta', 'facebook', 'instagram'];
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

    // Get connection
    const { data: connection } = await supabase
      .from("platform_connections")
      .select("*")
      .eq("seller_id", seller.id)
      .eq("platform", platform)
      .single();

    if (!connection) {
      return NextResponse.json(
        { error: `${platform} connection not found` },
        { status: 404 }
      );
    }

    // Refresh token
    const result = await refreshPlatformToken(platform, connection.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Token refresh failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${platform} token refreshed successfully`,
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
