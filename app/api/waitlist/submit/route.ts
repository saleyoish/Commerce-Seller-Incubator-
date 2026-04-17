import { createAdminSupabase } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, whatYouSell, hasLiveExperience } = body;

    if (!name || !email || !phone || !whatYouSell) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabase();

    // Check if email already exists
    const { data: existing } = await supabase
      .from("waitlist")
      .select("id")
      .eq("email", email)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "This email is already on our waitlist" },
        { status: 409 }
      );
    }

    // Insert into waitlist
    const { data, error } = await supabase
      .from("waitlist")
      .insert({
        name,
        email,
        phone,
        what_you_sell: whatYouSell,
        has_live_experience: hasLiveExperience,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Waitlist submission error:", error);
      return NextResponse.json(
        { error: "Failed to submit" },
        { status: 500 }
      );
    }

    // Send confirmation email
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/email/waitlist-confirmation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: email, name }),
        }
      );
    } catch (e) {
      console.error("Failed to send confirmation email:", e);
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Waitlist API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
