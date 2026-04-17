import { createAdminSupabase } from "@/lib/supabase-admin";
import { listTikTokOrders } from "@/lib/tiktok-api";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get("sellerId");

    if (!sellerId) {
      return NextResponse.json(
        { error: "Missing sellerId" },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabase();

    // Get seller's TikTok connection
    const { data: connection, error: connectionError } = await supabase
      .from("tiktok_shop_connections")
      .select("*")
      .eq("seller_id", sellerId)
      .eq("is_connected", true)
      .single();

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: "No active TikTok Shop connection" },
        { status: 400 }
      );
    }

    // Create sync log entry
    const { data: syncLog } = await supabase
      .from("tiktok_sync_logs")
      .insert({
        seller_id: sellerId,
        sync_type: "order_pull",
        status: "started",
      })
      .select()
      .single();

    const syncLogId = syncLog.id;

    // Demo mode - just update sync timestamp
    if (connection.access_token === "demo_token") {
      // Count existing demo orders
      const { data: existingOrders } = await supabase
        .from("tiktok_orders")
        .select("id")
        .eq("seller_id", sellerId);

      const orderCount = existingOrders?.length || 0;

      // Update sync log
      await supabase
        .from("tiktok_sync_logs")
        .update({
          status: "completed",
          items_total: orderCount,
          items_success: orderCount,
          completed_at: new Date().toISOString(),
        })
        .eq("id", syncLogId);

      // Update last sync time
      await supabase
        .from("tiktok_shop_connections")
        .update({
          last_order_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", connection.id);

      return NextResponse.json({
        success: true,
        demoMode: true,
        syncLogId,
        total: orderCount,
        new: 0,
        updated: 0,
        errors: 0,
        message: "Demo mode: Orders sync simulated",
      });
    }

    // Calculate time range (last 24 hours or since last sync)
    const lastSync = connection.last_order_sync_at;
    const fromTime = lastSync
      ? new Date(lastSync)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);

    let allOrders: any[] = [];
    let nextPageToken: string | undefined;
    let hasMore = true;

    // Paginate through orders
    while (hasMore) {
      const result = await listTikTokOrders(connection.access_token, {
        page_size: 50,
        page_token: nextPageToken,
        create_time_from: fromTime.toISOString(),
        create_time_to: new Date().toISOString(),
      });

      allOrders = allOrders.concat(result.orders);
      nextPageToken = result.next_page_token;
      hasMore = !!nextPageToken;
    }

    let newCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    // Process each order
    for (const order of allOrders) {
      try {
        const { data: existingOrder } = await supabase
          .from("tiktok_orders")
          .select("id, order_status")
          .eq("tiktok_order_id", order.order_id)
          .single();

        if (existingOrder) {
          // Update if status changed
          if (existingOrder.order_status !== order.status) {
            await supabase
              .from("tiktok_orders")
              .update({
                order_status: order.status,
                buyer_info: order.recipient_info,
                items: order.item_list,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingOrder.id);

            updatedCount++;
          }
        } else {
          // Create new order
          await supabase.from("tiktok_orders").insert({
            seller_id: sellerId,
            tiktok_order_id: order.order_id,
            order_status: order.status,
            buyer_info: {
              name: order.recipient_info.name,
              email: order.recipient_info.email,
              phone: order.recipient_info.phone,
              address: order.recipient_info.address,
            },
            items: order.item_list.map((item: any) => ({
              product_id: item.product_id,
              sku_id: item.sku_id,
              product_name: item.product_name,
              quantity: item.quantity,
              price: item.price,
            })),
            subtotal: parseFloat(order.payment.sub_total) || 0,
            shipping_cost: parseFloat(order.payment.shipping_fee) || 0,
            tax_amount: parseFloat(order.payment.tax) || 0,
            discount_amount: parseFloat(order.payment.discount_amount) || 0,
            total_amount: parseFloat(order.payment.total_amount) || 0,
            currency: order.payment.currency || "USD",
            platform_fee: parseFloat(order.payment.platform_fee) || 0,
            seller_earnings:
              (parseFloat(order.payment.total_amount) || 0) * 0.8, // 80% to seller
            created_at: order.create_time || new Date().toISOString(),
            paid_at: order.pay_time,
          });

          newCount++;

          // Check for referral bonus (first sale)
          await checkAndProcessReferralBonus(supabase, sellerId, order);
        }
      } catch (error) {
        console.error(`Failed to process order ${order.order_id}:`, error);
        errorCount++;
      }
    }

    // Update sync log
    await supabase
      .from("tiktok_sync_logs")
      .update({
        status: errorCount > 0 ? "failed" : "completed",
        items_total: allOrders.length,
        items_success: newCount + updatedCount,
        items_failed: errorCount,
        completed_at: new Date().toISOString(),
      })
      .eq("id", syncLogId);

    // Update last sync time
    await supabase
      .from("tiktok_shop_connections")
      .update({
        last_order_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);

    return NextResponse.json({
      success: true,
      syncLogId,
      total: allOrders.length,
      new: newCount,
      updated: updatedCount,
      errors: errorCount,
    });
  } catch (error) {
    console.error("Order sync error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function checkAndProcessReferralBonus(
  supabase: any,
  sellerId: string,
  order: any
) {
  try {
    // Check if this seller was referred
    const { data: referral } = await supabase
      .from("referrals")
      .select("*")
      .eq("referred_id", sellerId)
      .eq("status", "approved")
      .single();

    if (!referral) return;

    // Check if this is their first completed order
    const { data: previousOrders } = await supabase
      .from("tiktok_orders")
      .select("id")
      .eq("seller_id", sellerId)
      .eq("order_status", "completed")
      .limit(1);

    // If no previous completed orders, this is first sale
    if (!previousOrders || previousOrders.length === 0) {
      // Update referral to active (triggers bonus)
      await supabase
        .from("referrals")
        .update({
          status: "active",
          first_sale_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", referral.id);

      // Send notification to referrer
      const { data: referrer } = await supabase
        .from("sellers")
        .select("email")
        .eq("id", referral.referrer_id)
        .single();

      if (referrer) {
        await fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL}/api/email/referral-bonus-earned`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: referrer.email,
              bonusAmount: referral.bonus_amount || 50,
              referredEmail: referral.referred_email,
            }),
          }
        );
      }
    }
  } catch (error) {
    console.error("Referral bonus processing error:", error);
  }
}
