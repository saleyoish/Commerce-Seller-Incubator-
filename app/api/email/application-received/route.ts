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

    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || "onboarding@resend.dev",
      to,
      subject: "Application Received - TikTok Shop Fast Track",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Application Received</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #dc2626 0%, #db2777 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Application Received</h1>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <h2 style="color: #111827; margin-top: 0;">Hi ${name},</h2>
              
              <p style="font-size: 16px; color: #4b5563;">
                We've received your complete application for TikTok Shop Fast Track. Thank you for providing all the details!
              </p>
              
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #111827;">What happens next?</h3>
                <ol style="color: #4b5563; padding-left: 20px;">
                  <li style="margin-bottom: 10px;"><strong>Application Review:</strong> Our team will review your detailed application within 24 hours</li>
                  <li style="margin-bottom: 10px;"><strong>Approval:</strong> Once approved, you'll get immediate access to the training hub</li>
                  <li style="margin-bottom: 10px;"><strong>Training:</strong> Complete the training modules at your own pace</li>
                  <li><strong>Go Live:</strong> Start selling on TikTok Shop within days</li>
                </ol>
              </div>
              
              <div style="background: #fef3c7; border: 1px solid #fcd34d; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>Questions?</strong> Reply to this email anytime. We're here to support you through the process.
                </p>
              </div>
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                Best regards,<br>
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
