import { createServerSideSupabase } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accessToken } = body;

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

    // Whatnote doesn't have a public OAuth flow yet, so we use API token authentication
    // For demo purposes, we'll accept a token directly
    if (!accessToken) {
      return NextResponse.json(
        { error: "Access token is required for Whatnot connection" },
        { status: 400 }
      );
    }

    // Store connection in platform_connections table
    const platformConnectionPayload = {
      seller_id: seller.id,
      platform: 'whatnot',
      status: 'connected',
      platform_username: 'Whatnot Seller',
      platform_user_id: null,
      access_token: accessToken,
      refresh_token: null,
      token_expires_at: null, // Whatnot tokens don't expire
      metadata: {
        tokenType: 'api_token',
        connectedVia: 'manual',
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

    return NextResponse.json({ 
      success: true,
      message: "Whatnot connection established" 
    });
  } catch (error) {
    console.error("Whatnot connect error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
