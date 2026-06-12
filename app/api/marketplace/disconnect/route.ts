import { createServerSideSupabase } from "@/lib/supabase-server";
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

    const validPlatforms = ['tiktok', 'whatnot', 'meta', 'facebook', 'instagram', 'youtube'];
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

    // Update connection status to disconnected
    const { error } = await supabase
      .from("platform_connections")
      .update({
        status: 'disconnected',
        disconnected_at: new Date().toISOString(),
        disconnected_reason: 'User disconnected',
        access_token: null, // Clear tokens for security
        refresh_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq("seller_id", seller.id)
      .eq("platform", platform);

    if (error) {
      console.error("Failed to disconnect:", error);
      return NextResponse.json(
        { error: "Failed to disconnect platform" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: `${platform} disconnected successfully` 
    });
  } catch (error) {
    console.error("Disconnect error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
