import { createAdminSupabase } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sellerId, platform, saleAmount } = body;
    
    const supabase = createAdminSupabase();
    
    if (!sellerId) {
      return NextResponse.json({ error: "sellerId required" }, { status: 400 });
    }
    
    // Calculate fees
    const amount = parseFloat(saleAmount) || 70;
    const platformFeeRate = platform === 'facebook' ? 0.05 : 0.08;
    const platformFee = amount * platformFeeRate;
    const subtotal = amount - platformFee;
    const ourCommission = subtotal * 0.15;
    const sellerPayout = subtotal - ourCommission;
    
    // Create sale
    const { data: sale, error } = await supabase
      .from("platform_sales")
      .insert({
        seller_id: sellerId,
        platform: platform || 'facebook',
        product_name: 'Test Product',
        sale_amount: amount,
        platform_fee: Number(platformFee.toFixed(2)),
        our_commission: Number(ourCommission.toFixed(2)),
        seller_payout: Number(sellerPayout.toFixed(2)),
        sale_date: new Date().toISOString(),
        buyer_info: { name: 'Test Buyer' },
        entry_type: 'manual',
        verification_status: 'pending',
        payout_status: 'pending',
      })
      .select()
      .single();
    
    if (error) {
      console.error("[Seed Sale] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, sale });
  } catch (e: any) {
    console.error("[Seed Sale] Exception:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
