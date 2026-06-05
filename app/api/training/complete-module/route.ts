import { createAdminSupabase } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const moduleId = formData.get("moduleId") as string;
    const sellerId = formData.get("sellerId") as string;

    if (!moduleId || !sellerId) {
      return NextResponse.json(
        { error: "Missing module ID or seller ID" },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabase();

    // Check if already completed
    const { data: existing } = await supabase
      .from("training_progress")
      .select("id")
      .eq("seller_id", sellerId)
      .eq("module_id", moduleId)
      .single();

    if (existing) {
      // Update to completed
      const { error } = await supabase
        .from("training_progress")
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) {
        return NextResponse.json(
          { error: "Failed to update progress" },
          { status: 500 }
        );
      }
    } else {
      // Insert new record
      const { error } = await supabase.from("training_progress").insert({
        seller_id: sellerId,
        module_id: moduleId,
        completed: true,
        completed_at: new Date().toISOString(),
      });

      if (error) {
        return NextResponse.json(
          { error: "Failed to save progress" },
          { status: 500 }
        );
      }
    }


    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/training?completed=${moduleId}`
    );
  } catch (error) {
    console.error("Complete module error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
