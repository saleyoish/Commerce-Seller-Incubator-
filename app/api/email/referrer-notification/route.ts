import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const { referralId, referrerEmail, referredEmail, referredName } = await request.json();
    
    console.log("Referrer notification API called with:", { referralId, referrerEmail, referredEmail, referredName });

    if (!referralId || !referrerEmail) {
      console.error("Missing required fields:", { referralId, referrerEmail });
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabase();
    
    // Get referral details
    const { data: referral, error } = await supabase
      .from("referrals")
      .select("*")
      .eq("id", referralId)
      .single();

    if (error || !referral) {
      console.error("Error fetching referral:", error);
      return NextResponse.json(
        { error: "Referral not found" },
        { status: 404 }
      );
    }

    // Get referrer's seller details
    const { data: referrer } = await supabase
      .from("sellers")
      .select("business_name, email")
      .eq("id", referral.referrer_id)
      .single();

    const referrerName = referrer?.business_name || referrerEmail;
    const referredDisplayName = referredName || referredEmail || "Your Referral";

    console.log("Sending email to referrer via Gmail:", referrerEmail);
    
    // Send email using Gmail API
    const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/email/send-gmail`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: referrerEmail,
        subject: "🎉 Your Referral Has Been Approved!",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Your Referral Approved!</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Great News!</h1>
              </div>
              
              <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
                <h2 style="color: #111827; margin-top: 0;">Hi ${referrerName}!</h2>
                
                <p style="font-size: 16px; color: #4b5563; margin-bottom: 20px;">
                  Exciting news! The person you referred <strong style="color: #059669;">${referredDisplayName}</strong> has been <strong style="color: #059669;">APPROVED</strong>!
                </p>
                
                <div style="background: #f8fafc; border: 1px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #065f46;">What This Means for You:</h3>
                  <ul style="color: #047857; padding-left: 20px; margin-bottom: 0;">
                    <li style="margin-bottom: 10px;">✅ <strong>You can now earn bonuses</strong> from their sales performance</li>
                    <li style="margin-bottom: 10px;">✅ <strong>Referral tracking is active</strong> - monitor in your dashboard</li>
                    <li style="margin-bottom: 10px;">✅ <strong>Commissions are now enabled</strong> for this referral</li>
                  </ul>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard" 
                     style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #db2777 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    View Your Referrals
                  </a>
                </div>
                
                <div style="background: #fef3c7; border: 1px solid #fcd34d; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #92400e; font-size: 14px;">
                    <strong>💡 Tip:</strong> Support your referrals to maximize your earnings! The more successful they are, the more you earn.
                  </p>
                </div>
                
                <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                  Congratulations on your growing network!<br>
                  The TikTok Shop Fast Track Team
                </p>
              </div>
            </body>
          </html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error("Gmail send error:", errorData);
      return NextResponse.json(
        { error: "Failed to send email", details: errorData },
        { status: 500 }
      );
    }

    const data = await emailResponse.json();
    console.log("Email sent successfully via Gmail:", data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Email API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
