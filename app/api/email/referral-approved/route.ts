import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const { referralId, sellerEmail, referrerName } = await request.json();

    if (!referralId || !sellerEmail || !referrerName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get referral details to include in email
    const supabase = createAdminSupabase();
    const { data: referral, error } = await supabase
      .from("referrals")
      .select(`
        *,
        referrer:referrer_id (email, referral_code)
      `)
      .eq("id", referralId)
      .single();

    if (error || !referral) {
      console.error("Error fetching referral:", error);
      return NextResponse.json(
        { error: "Referral not found" },
        { status: 404 }
      );
    }

    const { data: seller } = await supabase
      .from("sellers")
      .select("email")
      .eq("id", referral.referred_id)
      .single();

    const sellerName = seller?.email || sellerEmail;

    console.log("Sending referral approved email via Gmail to:", sellerEmail, "and referrer:", referral.referrer?.email);
    
    // Send email using Gmail API
    const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/email/send-gmail`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: [sellerEmail, referral.referrer?.email].filter(Boolean),
        subject: "🎉 Referral Approved - Start Earning!",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Referral Approved!</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Referral Approved!</h1>
              </div>
              
              <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
                <h2 style="color: #111827; margin-top: 0;">Congratulations ${sellerName}!</h2>
                
                <p style="font-size: 16px; color: #4b5563; margin-bottom: 20px;">
                  Great news! Your referral has been <strong style="color: #059669;">APPROVED</strong>. 
                  Your referrer <strong>${referrerName}</strong> can now start earning bonuses from your sales!
                </p>
                
                <div style="background: #f8fafc; border: 1px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #065f46;">What This Means:</h3>
                  <ul style="color: #047857; padding-left: 20px; margin-bottom: 0;">
                    <li style="margin-bottom: 10px;">✅ <strong>Your referral is now active</strong> and can earn from your sales</li>
                    <li style="margin-bottom: 10px;">✅ <strong>Bonus structure activated</strong> - earn based on referral performance</li>
                    <li style="margin-bottom: 10px;">✅ <strong>Tracking enabled</strong> - monitor referral earnings in dashboard</li>
                  </ul>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/dashboard" 
                     style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #db2777 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    Go to Dashboard
                  </a>
                </div>
                
                <div style="background: #fef3c7; border: 1px solid #fcd34d; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <h4 style="margin-top: 0; color: #111827; font-size: 14px;">Next Steps:</h4>
                  <ol style="color: #4b5563; font-size: 14px; padding-left: 20px; margin-bottom: 0;">
                    <li style="margin-bottom: 8px;"><strong>Complete Training:</strong> Finish all training modules</li>
                    <li style="margin-bottom: 8px;"><strong>Set Up TikTok Shop:</strong> Connect your shop</li>
                    <li style="margin-bottom: 8px;"><strong>Configure Streaming:</strong> Set up OBS and streaming tools</li>
                    <li style="margin-bottom: 8px;"><strong>Go Live:</strong> Start selling and earning!</li>
                  </ol>
                </div>
                
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #92400e; font-size: 14px;">
                    <strong>Need Help?</strong> Join our Discord community or reply to this email. 
                    We're here to ensure your success!
                  </p>
                </div>
                
                <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                  Excited to see you both succeed,<br>
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
    console.log("Referral approved email sent successfully via Gmail:", data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Email API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
