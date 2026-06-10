import { createAdminSupabase } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const id = formData.get("id") as string;

    if (!id) {
      return NextResponse.json(
        { error: "Missing referral ID" },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabase();

    // Get current referral data
    const { data: currentReferral, error: fetchError } = await supabase
      .from("referrals")
      .select(`
        *,
        referrer:referrer_id (email, referral_code),
        referred:referred_id (email)
      `)
      .eq("id", id)
      .single();

    if (fetchError || !currentReferral) {
      return NextResponse.json(
        { error: "Referral not found" },
        { status: 404 }
      );
    }

    // Update referral status to approved
    const { error: updateError } = await supabase
      .from("referrals")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to approve referral" },
        { status: 500 }
      );
    }

    // Send approval email to both seller and referrer
    try {
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/email/referral-approved`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          referralId: id,
          sellerEmail: currentReferral.referred?.email,
          referrerName: currentReferral.referrer?.email,
        }),
      });

      if (!emailResponse.ok) {
        throw new Error("Failed to send approval email");
      }

      // Send notification to referrer about their referral being approved
      const referrerEmail = currentReferral.referrer?.email;
      console.log("Referrer email:", referrerEmail);
      console.log("Current referral data:", JSON.stringify(currentReferral, null, 2));
      
      if (referrerEmail) {
        const referrerNotificationResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/email/referrer-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            referralId: id,
            referrerEmail: referrerEmail,
            referredEmail: currentReferral.referred?.email,
            referredName: currentReferral.referred?.email,
          }),
        });

        if (!referrerNotificationResponse.ok) {
          const errorText = await referrerNotificationResponse.text();
          console.error("Failed to send referrer notification:", referrerNotificationResponse.status, errorText);
        } else {
          console.log("Referrer notification sent successfully");
        }
      } else {
        console.error("No referrer email found for referral:", id);
      }

      // Send notification to admin
      const adminEmailResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/email/admin-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: "🎉 Referral Approved",
          message: `Referral has been approved:\n\nSeller: ${currentReferral.referred?.email}\nReferrer: ${currentReferral.referrer?.email}\nReferral ID: ${id}`,
          type: "referral_approved",
        }),
      });

      if (!adminEmailResponse.ok) {
        console.error("Failed to send admin notification");
      }

    } catch (emailError) {
      console.error("Email sending error:", emailError);
      // Don't fail the whole operation if email fails
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/admin/referrals?success=approved`
    );
  } catch (error) {
    console.error("Approve referral error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
