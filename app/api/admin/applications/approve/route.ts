import { createAdminSupabase } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const id = formData.get("id") as string;

    if (!id) {
      return NextResponse.json(
        { error: "Missing application ID" },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabase();

    // Get application details
    const { data: application, error: fetchError } = await supabase
      .from("applications")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Update application status
    const { error: updateError } = await supabase
      .from("applications")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to approve application" },
        { status: 500 }
      );
    }

    // Send approval email
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/email/application-approved`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: application.email,
            name: application.full_name,
          }),
        }
      );
    } catch (e) {
      console.error("Failed to send approval email:", e);
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/admin/applications?success=true`
    );
  } catch (error) {
    console.error("Approve application error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
