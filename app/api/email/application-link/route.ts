import { Resend } from "resend";
import { NextResponse } from "next/server";

const resendApiKey = process.env.RESEND_API_KEY;
const verifiedEmail = "team@scarerror.com"; // Resend test mode only allows this email

if (!resendApiKey) {
  console.error("RESEND_API_KEY is not set!");
}

const resend = new Resend(resendApiKey);

export async function POST(request: Request) {
  try {
    console.log("Email API called, RESEND_API_KEY exists:", !!resendApiKey);

    const { to, name, applicationUrl } = await request.json();
    console.log("Email request:", { to, name, hasUrl: !!applicationUrl });

    if (!to || !name || !applicationUrl) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || "onboarding@resend.dev",
      to,
      subject: "Complete Your Application - TikTok Shop Fast Track",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Complete Your Application</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #dc2626 0%, #db2777 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Congratulations!</h1>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <h2 style="color: #111827; margin-top: 0;">Hi ${name},</h2>
              
              <p style="font-size: 16px; color: #4b5563;">
                Great news! Your waitlist application has been <strong>approved</strong>. 
                You're one step closer to joining TikTok Shop Fast Track.
              </p>
              
              <div style="background: #fef3c7; border: 1px solid #fcd34d; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>Next Step:</strong> Complete your detailed application by clicking the button below. 
                  This helps us learn more about your products and experience so we can provide the best support.
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${applicationUrl}" 
                   style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #db2777 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  Complete Application
                </a>
              </div>
              
              <p style="font-size: 12px; color: #6b7280; word-break: break-all;">
                Or copy and paste this link: ${applicationUrl}
              </p>
              
              <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #111827; font-size: 14px;">What to expect:</h3>
                <ul style="color: #4b5563; font-size: 14px; padding-left: 20px; margin-bottom: 0;">
                  <li>Detailed application takes 5-10 minutes</li>
                  <li>Upload product photos</li>
                  <li>Get approved within 24 hours</li>
                  <li>Immediate access to training</li>
                </ul>
              </div>
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                If you have any questions, simply reply to this email.
              </p>
              
              <p style="font-size: 14px; color: #6b7280;">
                Best regards,<br>
                The TikTok Shop Fast Track Team
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Resend error:", JSON.stringify(error, null, 2));
      return NextResponse.json(
        { error: "Failed to send email", details: error },
        { status: 500 }
      );
    }

    console.log("Email sent successfully:", data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Email API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
