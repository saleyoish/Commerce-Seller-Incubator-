import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, extractToken } from '@/lib/jwt';
import { db } from '@/lib/db';

function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function GET(req: NextRequest) {
  try {
    // Get token directly from request
    const token = extractToken(req.headers, req.cookies);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get seller data
    const { data: sellerData, error: sellerError } = await db
      .from("sellers")
      .select("id, referral_code")
      .eq("id", payload.userId)
      .maybeSingle();

    if (sellerError) {
      console.error("Error fetching seller:", sellerError);
      return NextResponse.json({ error: 'Failed to fetch seller data' }, { status: 500 });
    }

    if (!sellerData) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    // Generate referral code if seller doesn't have one
    let finalSellerData = sellerData;
    if (!sellerData.referral_code) {
      const newReferralCode = generateReferralCode();
      const { data: updatedSeller, error: updateError } = await db
        .from("sellers")
        .update({ referral_code: newReferralCode })
        .eq("id", sellerData.id)
        .select("id, referral_code")
        .single();

      if (updateError) {
        console.error("Error generating referral code:", updateError);
      } else {
        finalSellerData = updatedSeller;
      }
    }

    // Get referrals
    const { data: referralsData, error: referralsError } = await db
      .from("referrals")
      .select("*")
      .eq("referrer_id", finalSellerData.id)
      .order("created_at", { ascending: false });

    if (referralsError) {
      console.error("Error fetching referrals:", referralsError);
      return NextResponse.json({ error: 'Failed to fetch referrals' }, { status: 500 });
    }

    return NextResponse.json({
      seller: finalSellerData,
      referrals: referralsData || [],
    });
  } catch (error) {
    console.error("Error in referrals API:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
