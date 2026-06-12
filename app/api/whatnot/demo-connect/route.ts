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
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!seller) {
      return NextResponse.json({ error: "Seller not found" }, { status: 404 });
    }

    // Demo mode - use demo token
    const demoToken = 'demo_token';

    // Store connection in platform_connections table
    const platformConnectionPayload = {
      seller_id: seller.id,
      platform: 'whatnot',
      status: 'connected',
      platform_username: 'Demo Whatnot Seller',
      platform_user_id: 'demo_user_id',
      access_token: demoToken,
      refresh_token: null,
      token_expires_at: null,
      metadata: {
        tokenType: 'demo',
        connectedVia: 'demo_mode',
      },
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: existingConnection } = await supabase
      .from('platform_connections')
      .select('id')
      .eq('seller_id', seller.id)
      .eq('platform', 'whatnot')
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

    // Trigger initial product sync
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/whatnot/sync-products?sellerId=${seller.id}&syncType=pull`,
        { method: "POST" }
      );
    } catch (e) {
      console.error("Initial Whatnot product sync failed:", e);
    }

    return NextResponse.json({ 
      success: true,
      demoMode: true,
      message: "Whatnot demo connection established" 
    });
  } catch (error) {
    console.error("Whatnot demo connect error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
