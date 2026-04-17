import { createAdminSupabase } from "@/lib/supabase-admin";
import { verifyWebhookSignature } from "@/lib/tiktok-api";
import { NextResponse } from "next/server";

// Webhook event types from TikTok
const WEBHOOK_EVENTS = {
  PRODUCT_UPDATE: "product_update",
  PRODUCT_DELETE: "product_delete",
  ORDER_STATUS_CHANGE: "order_status_change",
  ORDER_CANCEL: "order_cancel",
  INVENTORY_CHANGE: "inventory_change",
  SHIPMENT_UPDATE: "shipment_update",
} as const;

export async function POST(request: Request) {
  try {
    const payload = await request.text();
    const signature = request.headers.get("x-tiktok-signature") || "";
    
    // Get webhook secret from environment
    const webhookSecret = process.env.TIKTOK_WEBHOOK_SECRET || "";
    
    // Verify signature (if secret is configured)
    let signatureValid = true;
    if (webhookSecret) {
      signatureValid = verifyWebhookSignature(payload, signature, webhookSecret);
    }

    const data = JSON.parse(payload);
    const eventType = data.event_type;
    const shopId = data.shop_id;

    const supabase = createAdminSupabase();

    // Log the webhook event
    await supabase.from("tiktok_webhook_events").insert({
      event_type: eventType,
      tiktok_shop_id: shopId,
      tiktok_order_id: data.order_id,
      tiktok_product_id: data.product_id,
      payload: data,
      signature: signature,
      signature_valid: signatureValid,
    });

    // If signature is invalid and we require verification, reject
    if (!signatureValid && webhookSecret) {
      console.error("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Find the seller by shop_id
    const { data: connection } = await supabase
      .from("tiktok_shop_connections")
      .select("seller_id")
      .eq("tiktok_shop_id", shopId)
      .single();

    if (!connection) {
      console.error("No seller found for shop:", shopId);
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const sellerId = connection.seller_id;

    // Process based on event type
    switch (eventType) {
      case WEBHOOK_EVENTS.PRODUCT_UPDATE:
        await handleProductUpdate(supabase, sellerId, data);
        break;

      case WEBHOOK_EVENTS.PRODUCT_DELETE:
        await handleProductDelete(supabase, sellerId, data);
        break;

      case WEBHOOK_EVENTS.ORDER_STATUS_CHANGE:
        await handleOrderStatusChange(supabase, sellerId, data);
        break;

      case WEBHOOK_EVENTS.ORDER_CANCEL:
        await handleOrderCancel(supabase, sellerId, data);
        break;

      case WEBHOOK_EVENTS.INVENTORY_CHANGE:
        await handleInventoryChange(supabase, sellerId, data);
        break;

      case WEBHOOK_EVENTS.SHIPMENT_UPDATE:
        await handleShipmentUpdate(supabase, sellerId, data);
        break;

      default:
        console.log("Unhandled webhook event:", eventType);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleProductUpdate(supabase: any, sellerId: string, data: any) {
  const productId = data.product_id;
  const productData = data.product;

  // Update or create tiktok_products record
  const { data: existingProduct } = await supabase
    .from("tiktok_products")
    .select("id, product_id")
    .eq("seller_id", sellerId)
    .eq("tiktok_product_id", productId)
    .single();

  if (existingProduct) {
    await supabase
      .from("tiktok_products")
      .update({
        tiktok_status: productData.status,
        tiktok_attributes: productData.attributes,
        last_sync_at: new Date().toISOString(),
        sync_status: "synced",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingProduct.id);
  }

  // Update inventory if provided
  if (productData.skus) {
    for (const sku of productData.skus) {
      await supabase
        .from("tiktok_products")
        .update({
          sync_status: "out_of_sync",
        })
        .eq("tiktok_product_id", productId)
        .eq("sku", sku.seller_sku);
    }
  }
}

async function handleProductDelete(supabase: any, sellerId: string, data: any) {
  const productId = data.product_id;

  await supabase
    .from("tiktok_products")
    .update({
      tiktok_status: "deleted",
      sync_status: "failed",
      updated_at: new Date().toISOString(),
    })
    .eq("seller_id", sellerId)
    .eq("tiktok_product_id", productId);
}

async function handleOrderStatusChange(supabase: any, sellerId: string, data: any) {
  const orderId = data.order_id;
  const newStatus = data.new_status;
  const orderData = data.order;

  const { data: existingOrder } = await supabase
    .from("tiktok_orders")
    .select("id")
    .eq("tiktok_order_id", orderId)
    .single();

  if (existingOrder) {
    // Update existing order
    await supabase
      .from("tiktok_orders")
      .update({
        order_status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingOrder.id);
  } else {
    // Create new order
    await supabase.from("tiktok_orders").insert({
      seller_id: sellerId,
      tiktok_order_id: orderId,
      order_status: newStatus,
      buyer_info: orderData.buyer_info,
      items: orderData.item_list,
      subtotal: parseFloat(orderData.payment.sub_total),
      shipping_cost: parseFloat(orderData.payment.shipping_fee),
      tax_amount: parseFloat(orderData.payment.tax),
      discount_amount: parseFloat(orderData.payment.discount_amount),
      total_amount: parseFloat(orderData.payment.total_amount),
      currency: orderData.payment.currency || "USD",
      platform_fee: parseFloat(orderData.payment.platform_fee) || 0,
      seller_earnings:
        parseFloat(orderData.payment.total_amount) * 0.8, // 80% to seller
      created_at: orderData.create_time,
      paid_at: orderData.pay_time,
    });
  }

  // Mark webhook as processed
  await supabase
    .from("tiktok_webhook_events")
    .update({ processed: true, processed_at: new Date().toISOString() })
    .eq("tiktok_order_id", orderId)
    .eq("event_type", "order_status_change");
}

async function handleOrderCancel(supabase: any, sellerId: string, data: any) {
  const orderId = data.order_id;
  const cancelReason = data.cancel_reason;

  await supabase
    .from("tiktok_orders")
    .update({
      order_status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancel_reason: cancelReason,
      updated_at: new Date().toISOString(),
    })
    .eq("tiktok_order_id", orderId)
    .eq("seller_id", sellerId);
}

async function handleInventoryChange(supabase: any, sellerId: string, data: any) {
  const productId = data.product_id;
  const skuId = data.sku_id;
  const newQuantity = data.quantity;

  // Mark as needing sync
  await supabase
    .from("tiktok_products")
    .update({
      sync_status: "out_of_sync",
      updated_at: new Date().toISOString(),
    })
    .eq("seller_id", sellerId)
    .eq("tiktok_product_id", productId)
    .eq("sku", skuId);
}

async function handleShipmentUpdate(supabase: any, sellerId: string, data: any) {
  const orderId = data.order_id;
  const trackingInfo = data.tracking_info;

  await supabase
    .from("tiktok_orders")
    .update({
      shipping_provider: trackingInfo.provider,
      tracking_number: trackingInfo.tracking_number,
      shipped_at: trackingInfo.ship_time,
      order_status: "shipped",
      updated_at: new Date().toISOString(),
    })
    .eq("tiktok_order_id", orderId)
    .eq("seller_id", sellerId);
}
