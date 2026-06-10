import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { to, name, email, password } = await request.json();

    if (!to || !name || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;

    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || "onboarding@resend.dev",
      to,
      subject: "Your Account Has Been Approved - Start Selling Now!",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Account Approved</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #10B981 0%, #06B6D4 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Congratulations!</h1>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <h2 style="color: #111827; margin-top: 0;">Hi ${name},</h2>
              
              <p style="font-size: 16px; color: #4b5563;">
                Excellent news! Your seller account has been <strong style="color: #10B981;">APPROVED</strong> by our admin team.
              </p>
              
              <div style="background: #ecfdf5; border: 2px solid #10B981; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #047857;">Your Login Credentials</h3>
                <p style="margin: 10px 0; color: #4b5563;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 10px 0; color: #4b5563;"><strong>Password:</strong> ${password}</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${baseUrl}/login" 
                   style="display: inline-block; background: #10B981; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  Login to Your Account
                </a>
              </div>
              
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #111827;">What's Next?</h3>
                <ol style="color: #4b5563; padding-left: 20px; margin-bottom: 0;">
                  <li style="margin-bottom: 8px;">Log in to your dashboard</li>
                  <li style="margin-bottom: 8px;">Complete your profile and Stripe onboarding</li>
                  <li style="margin-bottom: 8px;">Upload your products</li>
                  <li>Schedule your first live stream!</li>
                </ol>
              </div>
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                You can change your password anytime from your account settings.
              </p>
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                Welcome to the team!<br>
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
