import { createAdminSupabase } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const id = formData.get("id") as string;

    if (!id) {
      return NextResponse.json(
        { error: "Missing referral ID" },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabase();

    // Update referral as paid
    const { error } = await supabase
      .from("referrals")
      .update({
        paid: true,
        paid_at: new Date().toISOString(),
        status: "paid",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to mark as paid" },
        { status: 500 }
      );
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/admin/referrals?success=true`
    );
  } catch (error) {
    console.error("Mark paid error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
