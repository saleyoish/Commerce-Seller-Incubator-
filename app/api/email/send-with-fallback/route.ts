import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

// Resend test mode only allows sending to the verified email
const VERIFIED_EMAIL = "team@scarerror.com";

interface EmailRequest {
  to: string;
  name: string;
  subject: string;
  html: string;
}

export async function POST(request: Request) {
  try {
    const body: EmailRequest = await request.json();
    const { to, name, subject, html } = body;

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // In test mode, we can only send to the verified email
    // So we send to verified email but include the intended recipient in the content
    const isTestMode = true; // Set to false after domain verification

    const actualRecipient = isTestMode ? VERIFIED_EMAIL : to;
    const testModeNotice = isTestMode
      ? `<div style="background: #fef3c7; border: 1px solid #fcd34d; padding: 10px; margin-bottom: 20px; border-radius: 4px;">
         <strong>TEST MODE:</strong> This email was intended for ${to} but sent to ${VERIFIED_EMAIL} because Resend is in test mode.
         <br>To send to any email, verify a domain at <a href="https://resend.com/domains">resend.com/domains</a>
       </div>`
      : "";

    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || "onboarding@resend.dev",
      to: actualRecipient,
      subject: isTestMode ? `[TEST for ${to}] ${subject}` : subject,
      html: testModeNotice + html,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { error: "Failed to send email", details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: data?.id,
      testMode: isTestMode,
      intendedRecipient: to,
      actualRecipient,
      note: isTestMode
        ? `Email sent to ${VERIFIED_EMAIL} instead of ${to} (test mode). Verify domain to send to any email.`
        : "Email sent successfully",
    });
  } catch (err) {
    console.error("Exception:", err);
    return NextResponse.json(
      { error: "Exception occurred", details: String(err) },
      { status: 500 }
    );
  }
}
