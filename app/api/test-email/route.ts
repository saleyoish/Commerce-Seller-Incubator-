import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  const apiKey = process.env.RESEND_API_KEY;
  
  console.log("Test email route called");
  console.log("API Key exists:", !!apiKey);
  console.log("API Key prefix:", apiKey?.substring(0, 10) + "...");
  
  if (!apiKey) {
    return NextResponse.json(
      { 
        error: "RESEND_API_KEY is not set!",
        fix: "Add RESEND_API_KEY=re_xxx to your .env.local file and restart the server"
      },
      { status: 500 }
    );
  }

  try {
    const { data, error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: "imrabiariazdev@gmail.com",
      subject: "Test Email - TikTok Shop",
      html: "<p>This is a test to verify Resend is working!</p>",
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { error: "Resend failed", details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: data?.id,
      note: "Check your inbox and spam folder"
    });
  } catch (err) {
    console.error("Exception:", err);
    return NextResponse.json(
      { error: "Exception occurred", details: String(err) },
      { status: 500 }
    );
  }
}
