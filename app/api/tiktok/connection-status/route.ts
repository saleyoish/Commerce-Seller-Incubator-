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

    // Get all connection states for this seller
    const { data: connections } = await supabase
      .from("tiktok_shop_connections")
      .select("*")
      .eq("seller_id", seller.id)
      .order("created_at", { ascending: false });

    // Determine connection status
    let status = "not_connected";
    let activeConnection = null;
    let pendingConnection = null;

    if (connections && connections.length > 0) {
      const connected = connections.find(conn => conn.is_connected === true);
      const pending = connections.find(conn => conn.is_connected === false || conn.is_connected === null);

      if (connected) {
        status = "connected";
        activeConnection = connected;
      } else if (pending) {
        status = "pending";
        pendingConnection = pending;
      }
    }

    return NextResponse.json({
      status,
      connection: activeConnection,
      pendingConnection,
      hasAnyConnection: connections && connections.length > 0
    });
  } catch (error) {
    console.error("Connection status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
