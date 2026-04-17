import { createAdminSupabase } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const id = formData.get("id") as string;

    if (!id) {
      return NextResponse.json(
        { error: "Missing waitlist ID" },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabase();

    // Get waitlist entry
    const { data: waitlistEntry, error: fetchError } = await supabase
      .from("waitlist")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !waitlistEntry) {
      return NextResponse.json(
        { error: "Waitlist entry not found" },
        { status: 404 }
      );
    }

    // Update status to approved
    const { error: updateError } = await supabase
      .from("waitlist")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update waitlist entry" },
        { status: 500 }
      );
    }

    // Send application link email
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const applicationUrl = `${baseUrl}/apply?token=${waitlistEntry.id}`;

    console.log("Sending email to:", waitlistEntry.email);

    try {
      const emailRes = await fetch(
        `${baseUrl}/api/email/send-with-fallback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: waitlistEntry.email,
            name: waitlistEntry.name,
            subject: "Complete Your Application - TikTok Shop Fast Track",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #dc2626 0%, #db2777 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1 style="color: white; margin: 0;">Congratulations!</h1>
                </div>
                <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb;">
                  <h2>Hi ${waitlistEntry.name},</h2>
                  <p>Your waitlist application has been <strong>approved</strong>!</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${applicationUrl}" 
                       style="display: inline-block; background: #dc2626; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                      Complete Application
                    </a>
                  </div>
                  <p style="font-size: 12px; color: #6b7280;">
                    Link: ${applicationUrl}
                  </p>
                </div>
              </div>
            `,
          }),
        }
      );

      const emailData = await emailRes.json();
      console.log("Email API response:", emailRes.status, emailData);

      if (!emailRes.ok) {
        console.error("Email API failed:", emailData);
      } else if (emailData.testMode) {
        console.log("📧 Test mode: Email sent to", emailData.actualRecipient, "instead of", waitlistEntry.email);
      }
    } catch (e) {
      console.error("Failed to send application link email:", e);
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/admin/waitlist?success=true`
    );
  } catch (error) {
    console.error("Approve waitlist error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
