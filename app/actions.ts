"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { verifyJWT } from "@/lib/jwt";
import { db } from "@/lib/db";
import { hashPassword, comparePassword } from "@/lib/password";

// Account update types
interface UpdateAccountData {
  name?: string;
  email?: string;
  phone?: string;
  currentPassword?: string;
  newPassword?: string;
}

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  return verifyJWT(token);
}

// Update user account information
export async function updateAccountAction(data: UpdateAccountData) {
  const payload = await getAuthUser();
  if (!payload) return { error: 'Unauthorized', success: false };

  try {
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (data.name) updates.name = data.name;
    if (data.phone) updates.phone = data.phone;

    // Update password if provided
    if (data.newPassword && data.currentPassword) {
      const { data: seller } = await db
        .from('sellers')
        .select('password_hash')
        .eq('user_id', payload.userId)
        .maybeSingle();

      if (!seller?.password_hash) return { error: 'User not found', success: false };

      const isValid = await comparePassword(data.currentPassword, seller.password_hash);
      if (!isValid) return { error: 'Current password is incorrect', success: false };

      updates.password_hash = await hashPassword(data.newPassword);
      updates.is_temp_password = false;
    }

    const { error: sellerError } = await db
      .from('sellers')
      .update(updates)
      .eq('user_id', payload.userId);

    if (sellerError) {
      console.error('Account update error:', sellerError);
      return { error: sellerError.message || 'Failed to update account', success: false };
    }

    revalidatePath('/seller/settings/account');
    return { success: true, message: 'Account updated successfully' };
  } catch (error: any) {
    console.error('Account update error:', error);
    return { error: error.message || 'Failed to update account', success: false };
  }
}

// Delete user account (marks as deleted, clears password)
export async function deleteAccountAction() {
  const payload = await getAuthUser();
  if (!payload) return { error: 'Unauthorized', success: false };

  try {
    await db
      .from('sellers')
      .update({ approval_status: 'deleted', password_hash: null, updated_at: new Date().toISOString() })
      .eq('user_id', payload.userId);

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

  // Check if email already exists
  const { data: existing } = await db
    .from("waitlist")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    throw new Error("This email is already on our waitlist");
  }

  // Insert into waitlist
  const { error } = await db
    .from("waitlist")
    .insert({
      name,
      email,
      phone,
      what_you_sell: whatYouSell,
      has_live_experience: hasLiveExperience,
      status: "pending",
    });

  if (error) {
    console.error("Waitlist submission error:", error);
    throw new Error("Failed to submit. Please try again.");
  }

  // Send confirmation email
  try {
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/email/waitlist-confirmation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: email, name }),
    });
  } catch (e) {
    console.error("Failed to send confirmation email:", e);
  }

  revalidatePath("/");
  return;
}
