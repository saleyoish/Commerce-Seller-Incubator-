import { createAdminSupabase } from "@/lib/supabase-admin";
import { exchangeCodeForTokens, getShopInfo } from "@/lib/tiktok-api";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Handle OAuth errors
    if (error) {
      console.error("TikTok OAuth error:", error, errorDescription);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/tiktok-shop?error=${encodeURIComponent(errorDescription || error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/tiktok-shop?error=Missing authorization code`
      );
    }

    // Decode state to get sellerId
    let sellerId: string;
    try {
      const stateData = JSON.parse(Buffer.from(state, "base64").toString());
      sellerId = stateData.sellerId;
    } catch {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/tiktok-shop?error=Invalid state parameter`
      );
    }

    const supabase = createAdminSupabase();

    // Verify seller exists
    const { data: seller } = await supabase
      .from("sellers")
      .select("id, email")
      .eq("id", sellerId)
      .single();

    if (!seller) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/tiktok-shop?error=Seller not found`
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Get shop info
    const shopInfo = await getShopInfo(tokens.access_token);

    // Calculate token expiration
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in);

    // Check if connection already exists
    const { data: existingConnection } = await supabase
      .from("tiktok_shop_connections")
      .select("id")
      .eq("seller_id", sellerId)
      .single();

    if (existingConnection) {
      // Update existing connection
      const { error: updateError } = await supabase
        .from("tiktok_shop_connections")
        .update({
          tiktok_shop_id: shopInfo.shop_id,
          shop_name: shopInfo.shop_name,
          shop_region: shopInfo.region,
          shop_status: shopInfo.shop_status || "active",
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt.toISOString(),
          scopes: shopInfo.granted_scopes || ["product", "order"],
          is_connected: true,
          connected_at: new Date().toISOString(),
          disconnected_at: null,
          disconnected_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingConnection.id);

      if (updateError) {
        console.error("Failed to update connection:", updateError);
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/tiktok-shop?error=Failed to save connection`
        );
      }
    } else {
      // Create new connection
      const { error: insertError } = await supabase
        .from("tiktok_shop_connections")
        .insert({
          seller_id: sellerId,
          tiktok_shop_id: shopInfo.shop_id,
          shop_name: shopInfo.shop_name,
          shop_region: shopInfo.region,
          shop_status: shopInfo.shop_status || "active",
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt.toISOString(),
          scopes: shopInfo.granted_scopes || ["product", "order"],
          is_connected: true,
          connected_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("Failed to create connection:", insertError);
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/tiktok-shop?error=Failed to create connection`
        );
      }
    }

    // Trigger initial product sync
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/tiktok/sync-products?sellerId=${sellerId}`,
        { method: "POST" }
      );
    } catch (e) {
      console.error("Initial product sync failed:", e);
    }

    // Send success email
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/email/tiktok-connected`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: seller.email,
            shopName: shopInfo.shop_name,
          }),
        }
      );
    } catch (e) {
      console.error("Failed to send connection email:", e);
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/tiktok-shop?success=connected`
    );
  } catch (error) {
    console.error("TikTok callback error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/tiktok-shop?error=${encodeURIComponent(
        error instanceof Error ? error.message : "Unknown error"
      )}`
    );
  }
}
