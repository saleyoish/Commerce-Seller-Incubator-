import { createServerSideSupabase } from "@/lib/supabase-server";
import { getTikTokAuthUrl } from "@/lib/tiktok-api";
import { NextResponse } from "next/server";
import { getPostHogClient } from "@/lib/posthog-server";

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
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!seller) {
      return NextResponse.json({ error: "Seller not found" }, { status: 404 });
    }

    // Check if TikTok API is configured
    const appKey = process.env.TIKTOK_APP_KEY;
    if (!appKey || appKey === "your_app_key_here") {
      // Return demo mode - no real API configured
      return NextResponse.json({ 
        demoMode: true,
        message: "TikTok API not configured - using demo mode" 
      });
    }

    // Generate TikTok auth URL
    const authUrl = getTikTokAuthUrl(seller.id);

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: user.email || seller.id,
      event: "tiktok_connect_initiated",
      properties: {
        seller_id: seller.id,
      },
    });

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error("Connect error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
