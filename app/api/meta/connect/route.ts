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

    // Check if Meta API is configured
    const appId = process.env.META_APP_ID;
    if (!appId || appId === "your_app_id_here") {
      return NextResponse.json({ 
        demoMode: true,
        message: "Meta API not configured - using demo mode" 
      });
    }

    // Generate Meta auth URL
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/meta/callback`;
    const state = Buffer.from(JSON.stringify({ sellerId: seller.id })).toString('base64');
    
    const scope = [
      'pages_manage_posts',
      'pages_read_engagement',
      'pages_manage_metadata',
      'catalog_management',
      'business_management',
      'instagram_basic',
      'instagram_content_publish',
      'instagram_manage_insights',
      'read_insights'
    ].join(',');

    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?` + new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      state: state,
      scope: scope,
      response_type: 'code',
    });

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error("Meta connect error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
