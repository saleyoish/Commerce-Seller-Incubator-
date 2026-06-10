import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { to, subject, html, text } = await request.json();

    if (!to || !subject) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject" },
        { status: 400 }
      );
    }

    const gmailUser = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailPassword) {
      console.error("Gmail credentials not configured");
      return NextResponse.json(
        { error: "Email service not configured" },
        { status: 500 }
      );
    }

    console.log("Sending email via Gmail to:", to);

    // Import nodemailer dynamically
    const nodemailer = (await import("nodemailer")).default;

    // Create Gmail transporter
    const transporter = nodemailer.createTransporter({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPassword,
      },
    });

    // Send email
    const info = await transporter.sendMail({
      from: `"TikTok Shop Fast Track" <${gmailUser}>`,
      to: Array.isArray(to) ? to : [to],
      subject: subject,
      html: html,
      text: text,
    });

    console.log("Email sent successfully:", info.messageId);

    return NextResponse.json({ 
      success: true, 
      messageId: info.messageId
    });

  } catch (error) {
    console.error("Gmail send error:", error);
    return NextResponse.json(
      { error: "Failed to send email", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
