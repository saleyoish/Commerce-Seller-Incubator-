import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import {
  sendAccountCreatedToSeller,
  sendNewSellerNotificationToAdmin,
} from "@/lib/gmail";

export async function POST(request: Request) {
  try {
    console.log("=== WAITLIST SIGNUP API STARTED ===");
    const body = await request.json();
    const { name, email, phone, whatYouSell, hasLiveExperience, referralCode: bodyReferralCode } = body;

    // Get referral code from cookie if exists (fallback to request body)
    const cookieStore = await cookies();
    const cookieReferralCode = cookieStore.get("referral_code")?.value;
    const referralCode = cookieReferralCode || bodyReferralCode;

    if (!name || !email || !phone || !whatYouSell) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const { data: existingSeller } = await db
      .from("sellers")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingSeller) {
      return NextResponse.json(
        { error: "An account is already connected for this email. Please log in instead." },
        { status: 409 }
      );
    }

    const { data: existingWaitlist } = await db
      .from("waitlist")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingWaitlist) {
      return NextResponse.json(
        { error: "This email is already on our waitlist" },
        { status: 409 }
      );
    }

    const userId = uuidv4();

    const { data: waitlistData, error: waitlistError } = await db
      .from("waitlist")
      .insert({
        name,
        email: normalizedEmail,
        phone,
        what_you_sell: whatYouSell,
        has_live_experience: hasLiveExperience,
        status: "pending",
        user_id: userId,
      })
      .select()
      .single();

    if (waitlistError) {
      console.error("Waitlist insert error:", waitlistError);
      return NextResponse.json(
        { error: `Failed to create waitlist entry: ${waitlistError.message}` },
        { status: 500 }
      );
    }

    const { data: newSeller, error: sellerError } = await db
      .from("sellers")
      .insert({
        user_id: userId,
        email: normalizedEmail,
        phone,
        name: name || null,
        approval_status: "pending",
        stripe_onboarding_status: "pending",
      })
      .select()
      .single();

    if (sellerError) {
      console.error("Failed to create seller record:", sellerError);
      if (waitlistData?.id) {
        await db.from("waitlist").delete().eq("id", waitlistData.id);
      }
      return NextResponse.json(
        { error: `Failed to create seller record: ${sellerError.message}` },
        { status: 500 }
      );
    }

    const sellerId = newSeller?.id ?? null;
    let referralCreated = false;
    let referralErrorMsg = null;

    if (sellerId && referralCode) {
      const { data: existingReferral } = await db
        .from("referrals")
        .select("id")
        .eq("referred_id", sellerId)
        .maybeSingle();

      if (!existingReferral) {
        const { data: referrer } = await db
          .from("sellers")
          .select("id")
          .eq("referral_code", referralCode)
          .maybeSingle();

        if (referrer) {
          const { error: referralError } = await db.from("referrals").insert({
            referrer_id: referrer.id,
            referred_id: sellerId,
            referred_email: normalizedEmail,
            referral_code: referralCode,
            status: "approved",
            bonus_amount: 50,
            paid: false,
          });

          if (referralError) {
            console.error("Failed to create referral record:", referralError);
            referralErrorMsg = referralError.message;
          } else {
            referralCreated = true;
          }
        } else {
          referralErrorMsg = "Referrer not found for code: " + referralCode;
        }
      } else {
        referralErrorMsg = "Referral already exists";
      }
    }

    try {
      await sendAccountCreatedToSeller(normalizedEmail, name);
    } catch (e: any) {
      console.error("Failed to send account created email to seller:", e);
    }

    try {
      let { data: admins } = await db.from("admins").select("email");
      if (!admins || admins.length === 0) {
        const { data: adminProfiles } = await db
          .from("profiles")
          .select("email")
          .eq("role", "admin");
        if (adminProfiles && adminProfiles.length > 0) {
          admins = adminProfiles;
        }
      }

      if (admins && admins.length > 0) {
        for (const admin of admins) {
          if (admin.email) {
            await sendNewSellerNotificationToAdmin(
              admin.email,
              name,
              normalizedEmail,
              phone,
              whatYouSell,
              hasLiveExperience
            );
          }
        }
      }
    } catch (e) {
      console.error("Failed to send admin notifications:", e);
    }

    return NextResponse.json({
      success: true,
      message: "Account created successfully. You will receive login credentials once approved.",
      userId,
      waitlistId: waitlistData.id,
      referral: {
        code: referralCode,
        created: referralCreated,
        error: referralErrorMsg,
      },
    });
  } catch (error: any) {
    console.error("Waitlist signup error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
