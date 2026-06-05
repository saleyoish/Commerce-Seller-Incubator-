import { createAdminSupabase } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import {
  generatePassword,
  sendApprovalEmailToSeller,
} from "@/lib/gmail";

export async function POST(request: Request) {
  try {
    console.log("=== APPROVAL API STARTED ===");
    console.log("Gmail user:", process.env.GMAIL_USER ? "Set" : "NOT SET");
    console.log("Gmail app password:", process.env.GMAIL_APP_PASSWORD ? "Set" : "NOT SET");
    
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

    // Update waitlist status to approved
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

    // Get the user_id from waitlist entry if exists, or find/create user
    let userId = waitlistEntry.user_id;
    let password: string | undefined;
    
    console.log("Waitlist entry user_id:", userId);

    if (!userId) {
      console.log("No user_id in waitlist, checking if auth user exists...");
      // Check if auth user exists
      const { data: users } = await supabase.auth.admin.listUsers();
      const existingUser = users?.users.find((u: any) => u.email === waitlistEntry.email);

      if (existingUser) {
        console.log("Found existing auth user:", existingUser.id);
        userId = existingUser.id;
        // Update waitlist with user_id for future
        await supabase.from("waitlist").update({ user_id: userId }).eq("id", id);
      } else {
        console.log("No existing auth user found, creating new user...");
        // Create new auth user with auto-generated password
        password = generatePassword();
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: waitlistEntry.email,
          password,
          email_confirm: true,
        });

        if (!authError && authData.user) {
          userId = authData.user.id;
          console.log("New auth user created:", userId);
          // Update waitlist with user_id
          await supabase.from("waitlist").update({ user_id: userId }).eq("id", id);
        } else {
          console.error("Failed to create auth user:", authError);
        }
      }
    } else {
      console.log("Using existing user_id from waitlist:", userId);
    }

    // Update seller approval status if seller record exists
    if (userId) {
      const { data: seller } = await supabase
        .from("sellers")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (seller) {
        await supabase
          .from("sellers")
          .update({ approval_status: "approved" })
          .eq("user_id", userId);
      } else {
        // Create seller record with approved status
        await supabase.from("sellers").insert({
          user_id: userId,
          email: waitlistEntry.email,
          phone: waitlistEntry.phone,
          approval_status: "approved",
          stripe_onboarding_status: "pending",
        });
      }

      // If we don't have a password yet (user existed before), generate a new one
      if (!password) {
        password = generatePassword();
        console.log("Generated new password for existing user");
      }
      
      // Update user password
      const { error: passwordUpdateError } = await supabase.auth.admin.updateUserById(userId, { password });
      if (passwordUpdateError) {
        console.error("Failed to update user password:", passwordUpdateError);
      } else {
        console.log("User password updated successfully for:", waitlistEntry.email);
      }

      // Send approval email with credentials to seller via Gmail
      try {
        console.log("Sending approval email to:", waitlistEntry.email);
        console.log("Password length:", password?.length);
        const result = await sendApprovalEmailToSeller(
          waitlistEntry.email,
          waitlistEntry.name,
          waitlistEntry.email,
          password
        );
        console.log("Email send result:", result);
      } catch (e: any) {
        console.error("Failed to send approval email:", e);
        console.error("Error message:", e?.message);
        console.error("Error stack:", e?.stack);
      }
    } else {
      console.warn("No userId found, cannot send approval email or update password");
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/admin/waitlist?success=true`
    );
  } catch (error) {
    console.error("Approve waitlist error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
