"use server";

import { createServerSideSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function submitWaitlistAction(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const whatYouSell = formData.get("whatYouSell") as string;
  const hasLiveExperience = formData.get("hasLiveExperience") === "yes";
  const consent = formData.get("consent") === "on";

  if (!name || !email || !phone || !whatYouSell) {
    return { error: "Please fill in all required fields" };
  }

  if (!consent) {
    return { error: "You must agree to receive emails" };
  }

  const supabase = await createServerSideSupabase();

  // Check if email already exists
  const { data: existing } = await supabase
    .from("waitlist")
    .select("id")
    .eq("email", email)
    .single();

  if (existing) {
    return { error: "This email is already on our waitlist" };
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
    return { error: "Failed to submit. Please try again." };
  }

  // Send confirmation email
  try {
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/email/waitlist-confirmation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: email,
        name,
      }),
    });
  } catch (e) {
    console.error("Failed to send confirmation email:", e);
  }

  revalidatePath("/");
  redirect("/waitlist-success");
}
