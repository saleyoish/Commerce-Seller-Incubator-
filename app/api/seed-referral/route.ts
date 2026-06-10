import { createAdminSupabase } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { referrerEmail, referredEmail, referralCode } = body;
    
    const supabase = createAdminSupabase();
    
    // Find referrer
    const { data: referrer } = await supabase
      .from("sellers")
      .select("id, referral_code")
      .eq("email", referrerEmail)
      .single();
    
    if (!referrer) {
      return NextResponse.json({ error: "Referrer not found" }, { status: 404 });
    }
    
    // Find referred
    const { data: referred } = await supabase
      .from("sellers")
      .select("id, email")
      .eq("email", referredEmail)
      .single();
    
    if (!referred) {
      return NextResponse.json({ error: "Referred seller not found" }, { status: 404 });
    }
    
    // Create referral
    const { data: referral, error } = await supabase
      .from("referrals")
      .insert({
        referrer_id: referrer.id,
        referred_id: referred.id,
        referred_email: referredEmail,
        referral_code: referralCode || referrer.referral_code,
        status: "approved",
        bonus_amount: 50,
        paid: false,
      })
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, referral });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
