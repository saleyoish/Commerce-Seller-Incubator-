import { createAdminSupabase } from "@/lib/supabase-admin";
import { exchangeShortLivedToken, fetchUserBusinesses, fetchOwnedCatalogs } from "@/lib/meta-service";
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
      console.error("Meta OAuth error:", error, errorDescription);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/marketplace?error=${encodeURIComponent(errorDescription || error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/marketplace?error=Missing authorization code`
      );
    }

    // Decode state to get sellerId
    let sellerId: string;
    try {
      const stateData = JSON.parse(Buffer.from(state, "base64").toString());
      sellerId = stateData.sellerId;
    } catch {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/marketplace?error=Invalid state parameter`
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
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/marketplace?error=Seller not found`
      );
    }

    // Exchange code for long-lived token
    const tokens = await exchangeShortLivedToken(
      process.env.META_APP_ID,
      process.env.META_APP_SECRET,
      code
    );

    // Calculate token expiration (Meta long-lived tokens last ~60 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 60);

    // Fetch user's businesses and catalogs
    let businesses = [];
    let catalogs = [];
    let selectedCatalogId = null;

    try {
      businesses = await fetchUserBusinesses(tokens.access_token);
      
      if (businesses.length > 0) {
        // Get catalogs from the first business
        catalogs = await fetchOwnedCatalogs(businesses[0].id, tokens.access_token);
        if (catalogs.length > 0) {
          selectedCatalogId = catalogs[0].id;
        }
      }
    } catch (e) {
      console.error("Failed to fetch Meta businesses/catalogs:", e);
    }

    // Store connection in platform_connections table
    const platformConnectionPayload = {
      seller_id: sellerId,
      platform: 'meta',
      status: 'connected',
      platform_username: businesses[0]?.name || null,
      platform_user_id: businesses[0]?.id || null,
      access_token: tokens.access_token,
      refresh_token: tokens.access_token, // Meta uses same token for refresh
      token_expires_at: expiresAt.toISOString(),
      metadata: {
        businesses: businesses,
        catalogs: catalogs,
        selectedCatalogId: selectedCatalogId,
        tokenType: tokens.token_type || 'bearer',
        expiresIn: tokens.expires_in || 5184000, // 60 days in seconds
      },
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: existingConnection } = await supabase
      .from('platform_connections')
      .select('id')
      .eq('seller_id', sellerId)
      .eq('platform', 'meta')
      .maybeSingle();

    if (existingConnection) {
      await supabase
        .from('platform_connections')
        .update(platformConnectionPayload)
        .eq('id', existingConnection.id);
    } else {
      await supabase
        .from('platform_connections')
        .insert(platformConnectionPayload);
    }

    // Trigger initial product sync if catalog is available
    if (selectedCatalogId) {
      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL}/api/meta/sync-products?sellerId=${sellerId}`,
          { method: "POST" }
        );
      } catch (e) {
        console.error("Initial Meta product sync failed:", e);
      }
    }

    // Send success email
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/email/meta-connected`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: seller.email,
            businessName: businesses[0]?.name || 'Meta Commerce',
          }),
        }
      );
    } catch (e) {
      console.error("Failed to send connection email:", e);
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/marketplace?success=connected`
    );
  } catch (error) {
    console.error("Meta callback error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/marketplace?error=${encodeURIComponent(
        error instanceof Error ? error.message : "Unknown error"
      )}`
    );
  }
}
