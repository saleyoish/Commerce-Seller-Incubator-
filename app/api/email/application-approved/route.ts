import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { to, name } = await request.json();

    if (!to || !name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const trainingUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/training`;

    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || "onboarding@resend.dev",
      to,
      subject: "🎉 You're Approved! Welcome to TikTok Shop Fast Track",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Application Approved!</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🎉 You're Approved!</h1>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <h2 style="color: #111827; margin-top: 0;">Welcome, ${name}!</h2>
              
              <p style="font-size: 16px; color: #4b5563;">
                Congratulations! Your application has been <strong style="color: #059669;">APPROVED</strong>. 
                You're now officially part of TikTok Shop Fast Track!
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${trainingUrl}" 
                   style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #db2777 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  Access Training Hub
                </a>
              </div>
              
              <div style="background: #ecfdf5; border: 1px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #065f46;">Your Next Steps:</h3>
                <ol style="color: #047857; padding-left: 20px; margin-bottom: 0;">
                  <li style="margin-bottom: 8px;"><strong>Access Training:</strong> Complete all 8 training modules</li>
                  <li style="margin-bottom: 8px;"><strong>Set Up TikTok Shop:</strong> Follow the step-by-step guide</li>
                  <li style="margin-bottom: 8px;"><strong>Configure OBS:</strong> Set up your streaming software</li>
                  <li><strong>Go Live:</strong> Start selling and earning!</li>
                </ol>
              </div>
              
              <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h4 style="margin-top: 0; color: #111827; font-size: 14px;">Quick Links:</h4>
                <ul style="color: #4b5563; font-size: 14px; padding-left: 20px; margin-bottom: 0;">
                  <li><a href="${trainingUrl}" style="color: #dc2626;">Training Hub</a></li>
                  <li><a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard" style="color: #dc2626;">Seller Dashboard</a></li>
                  <li><a href="#" style="color: #dc2626;">Join Discord Community</a></li>
                </ul>
              </div>
              
              <div style="background: #fef3c7; border: 1px solid #fcd34d; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>Need Help?</strong> Join our Discord community or reply to this email. 
                  We're here to ensure your success!
                </p>
              </div>
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                Excited to see you succeed,<br>
                The TikTok Shop Fast Track Team
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Email API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
