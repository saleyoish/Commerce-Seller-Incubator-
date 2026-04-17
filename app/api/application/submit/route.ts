import { createAdminSupabase } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const waitlistId = formData.get("waitlistId") as string;
    const fullName = formData.get("fullName") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;

    if (!waitlistId || !fullName || !email || !phone) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabase();

    // Check if application already exists
    const { data: existing } = await supabase
      .from("applications")
      .select("id")
      .eq("waitlist_id", waitlistId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Application already submitted" },
        { status: 409 }
      );
    }

    // Build address JSON
    const address = {
      street: formData.get("street") as string,
      city: formData.get("city") as string,
      state: formData.get("state") as string,
      zip: formData.get("zip") as string,
    };

    // Get product categories
    const productCategories = formData.getAll("productCategories") as string[];

    // Get equipment
    const equipment = formData.getAll("equipment") as string[];
    const equipmentObj: Record<string, boolean> = {};
    equipment.forEach((item) => {
      equipmentObj[item.toLowerCase().replace(/\s+/g, "_")] = true;
    });

    // Get preferred times
    const preferredTimes = formData.getAll("preferredTimes") as string[];

    // Build availability JSON
    const availability = {
      hours_per_week: formData.get("hoursPerWeek") as string,
      preferred_times: preferredTimes,
    };

    // Insert application
    const { data, error } = await supabase
      .from("applications")
      .insert({
        waitlist_id: waitlistId,
        full_name: fullName,
        email,
        phone,
        address,
        has_llc: formData.get("hasLlc") === "yes",
        business_name: formData.get("businessName") as string,
        tax_id: formData.get("taxId") as string,
        product_categories: productCategories,
        inventory_value: formData.get("inventoryValue") as string,
        price_range: formData.get("priceRange") as string,
        tiktok_experience: formData.get("tiktokExperience") === "yes",
        live_experience: formData.get("liveExperience") === "yes",
        tiktok_username: formData.get("tiktokUsername") as string,
        monthly_goal: formData.get("monthlyGoal") as string,
        equipment: equipmentObj,
        availability,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Application submission error:", error);
      return NextResponse.json(
        { error: "Failed to submit application" },
        { status: 500 }
      );
    }

    // Update waitlist status
    await supabase
      .from("waitlist")
      .update({ status: "contacted" })
      .eq("id", waitlistId);

    // Send confirmation email
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/email/application-received`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: email, name: fullName }),
        }
      );
    } catch (e) {
      console.error("Failed to send confirmation email:", e);
    }

    // Send admin notification
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/email/admin-new-application`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: fullName, email }),
        }
      );
    } catch (e) {
      console.error("Failed to send admin notification:", e);
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Application API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
