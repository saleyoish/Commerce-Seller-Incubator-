"use server";

import { createServerSideSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPostHogClient } from "@/lib/posthog-server";

// Account update types
interface UpdateAccountData {
  name?: string;
  email?: string;
  phone?: string;
  currentPassword?: string;
  newPassword?: string;
}

// Update user account information
export async function updateAccountAction(data: UpdateAccountData) {
  const supabase = await createServerSideSupabase();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'Unauthorized', success: false };
  }

  try {
    // Update auth user metadata (name)
    if (data.name) {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { full_name: data.name }
      });
      if (updateError) throw updateError;
    }

    // Update email if provided
    if (data.email && data.email !== user.email) {
      const { error: emailError } = await supabase.auth.updateUser({
        email: data.email,
      });
      if (emailError) throw emailError;
    }

    // Update password if provided
    if (data.newPassword && data.currentPassword) {
      const { error: passwordError } = await supabase.auth.updateUser({
        password: data.newPassword,
      });
      if (passwordError) throw passwordError;
    }

    // Update seller profile in sellers table
    const { error: sellerError } = await supabase
      .from('sellers')
      .update({
        name: data.name,
        phone: data.phone,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (sellerError) {
      console.error('Seller update error:', sellerError);
      // Don't throw here as auth updates might have succeeded
    }

    revalidatePath('/dashboard/settings');
    return { success: true, message: 'Account updated successfully' };
  } catch (error: any) {
    console.error('Account update error:', error);
    return { error: error.message || 'Failed to update account', success: false };
  }
}

// Delete user account
export async function deleteAccountAction() {
  const supabase = await createServerSideSupabase();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'Unauthorized', success: false };
  }

  try {
    // Use admin client to delete user
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Delete user from auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) throw deleteError;

    // Sign out the user
    await supabase.auth.signOut();

    return { success: true, message: 'Account deleted successfully' };
  } catch (error: any) {
    console.error('Account deletion error:', error);
    return { error: error.message || 'Failed to delete account', success: false };
  }
}

export async function submitWaitlistAction(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const whatYouSell = formData.get("whatYouSell") as string;
  const hasLiveExperience = formData.get("hasLiveExperience") === "yes";
  const consent = formData.get("consent") === "on";

  if (!name || !email || !phone || !whatYouSell) {
    throw new Error("Please fill in all required fields");
  }

  if (!consent) {
    throw new Error("You must agree to receive emails");
  }

  const supabase = await createServerSideSupabase();

  // Check if email already exists
  const { data: existing } = await supabase
    .from("waitlist")
    .select("id")
    .eq("email", email)
    .single();

  if (existing) {
    throw new Error("This email is already on our waitlist");
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
    throw new Error("Failed to submit. Please try again.");
  }

  // Track waitlist submission
  const posthog = getPostHogClient();
  posthog.capture({
    distinctId: email,
    event: "waitlist_submitted",
    properties: {
      name,
      email,
      what_you_sell: whatYouSell,
      has_live_experience: hasLiveExperience,
    },
  });

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
