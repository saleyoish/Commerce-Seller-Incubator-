import { createAdminSupabase } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  generatePassword,
  sendAccountCreatedToSeller,
  sendNewSellerNotificationToAdmin,
} from "@/lib/gmail";

export async function POST(request: Request) {
  try {
    console.log("=== WAITLIST SIGNUP API STARTED ===");
    const body = await request.json();
    const { name, email, phone, whatYouSell, hasLiveExperience } = body;
    console.log("Request body:", { name, email, phone, whatYouSell, hasLiveExperience });

    // Get referral code from cookie if exists (fallback to request body)
    const cookieStore = await cookies();
    const cookieReferralCode = cookieStore.get("referral_code")?.value;
    const bodyReferralCode = body.referralCode;
    const referralCode = cookieReferralCode || bodyReferralCode;
    console.log("Referral code from cookie:", cookieReferralCode);
    console.log("Referral code from body:", bodyReferralCode);
    console.log("Final referral code used:", referralCode);

    if (!name || !email || !phone || !whatYouSell) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabase();

    // Check if auth user already exists
    const { data: users } = await supabase.auth.admin.listUsers();
    let existingUser = users?.users.find((u: any) => u.email === email);

    // Check if seller account already exists for this user
    let existingSeller: any = null;
    
    if (existingUser) {
      let sellerData = await supabase
        .from("sellers")
        .select("id, approval_status")
        .eq("user_id", existingUser.id)
        .maybeSingle();

      existingSeller = sellerData;

      if (existingSeller) {
        return NextResponse.json(
          { error: "An account is already connected for this email. Please log in instead." },
          { status: 409 }
        );
      }
    }

    // Check if email already exists in waitlist
    const { data: existingWaitlist } = await supabase
      .from("waitlist")
      .select("id")
      .eq("email", email)
      .single();

    if (existingWaitlist) {
      return NextResponse.json(
        { error: "This email is already on our waitlist" },
        { status: 409 }
      );
    }

    // Additional check: If user exists but seller was deleted, remove from waitlist
    if (existingUser && !existingSeller) {
      // User exists in auth but no seller record means it was deleted
      // Remove from waitlist to allow re-registration
      await supabase
        .from("waitlist")
        .delete()
        .eq("email", email);
      
      console.log(`Removed deleted user ${email} from waitlist for re-registration`);
    }

    let userId: string;
    let password: string;

    if (existingUser) {
      // User already exists, use existing ID
      userId = existingUser.id;
      // Generate a new password since we don't know the old one
      password = generatePassword();
      // Update the user's password
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        { password }
      );
      if (updateError) {
        console.error("Failed to update user password:", updateError);
      }
    } else {
      // Create new auth user with auto-generated password
      password = generatePassword();
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (authError) {
        return NextResponse.json(
          { error: authError.message },
          { status: 400 }
        );
      }

      userId = authData.user!.id;
    }

    // Insert into waitlist with pending status
    const { data: waitlistData, error: waitlistError } = await supabase
      .from("waitlist")
      .insert({
        name,
        email,
        phone,
        what_you_sell: whatYouSell,
        has_live_experience: hasLiveExperience,
        status: "pending",
        user_id: userId,
      })
      .select()
      .single();

    if (waitlistError) {
      console.error("Waitlist insert error:", waitlistError);
      // Rollback: delete auth user if we just created it
      if (!existingUser) {
        await supabase.auth.admin.deleteUser(userId);
      }
      return NextResponse.json(
        { error: `Failed to create waitlist entry: ${waitlistError.message}` },
        { status: 500 }
      );
    }

    // Check if seller record already exists - handle duplicates
    const { data: sellers } = await supabase
      .from("sellers")
      .select("id")
      .eq("user_id", userId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    const currentSeller = sellers && sellers.length > 0 ? sellers[0] : null;

    let sellerId: string | null = null;

    if (!currentSeller) {
      // Create seller record
      const { data: newSeller, error: sellerError } = await supabase
        .from("sellers")
        .insert({
          user_id: userId,
          email,
          phone,
          approval_status: "pending",
          stripe_onboarding_status: "pending",
        })
        .select()
        .single();

      if (sellerError) {
        console.error("Failed to create seller record:", sellerError);
      } else {
        sellerId = newSeller?.id || null;
        console.log("Created new seller:", sellerId);
      }
    } else {
      sellerId = existingSeller.id;
      console.log("Using existing seller:", sellerId);
    }

    // Create referral record if referral code exists and seller ID is available
    let referralCreated = false;
    let referralErrorMsg = null;
    
    if (sellerId && referralCode) {
      // Check if referral already exists for this seller
      const { data: existingReferral } = await supabase
        .from("referrals")
        .select("id")
        .eq("referred_id", sellerId)
        .maybeSingle();

      if (existingReferral) {
        console.log("Referral already exists for this seller");
        referralErrorMsg = "Referral already exists";
      } else {
        // Look up referrer by referral code
        const { data: referrer } = await supabase
          .from("sellers")
          .select("id")
          .eq("referral_code", referralCode)
          .single();

        if (referrer) {
          console.log("Found referrer:", referrer.id);
          // Create referral record
          const { error: referralError } = await supabase.from("referrals").insert({
            referrer_id: referrer.id,
            referred_id: sellerId,
            referred_email: email,
            referral_code: referralCode,
            status: "approved",
            bonus_amount: 50,
            paid: false,
          });

          if (referralError) {
            console.error("Failed to create referral record:", referralError);
            referralErrorMsg = referralError.message;
          } else {
            console.log("Referral record created successfully:", referrer.id, "->", sellerId);
            referralCreated = true;
          }
        } else {
          console.warn("Referrer not found for code:", referralCode);
          referralErrorMsg = "Referrer not found for code: " + referralCode;
        }
      }
    } else {
      console.log("Skipping referral creation - sellerId:", sellerId, "referralCode:", referralCode);
      referralErrorMsg = "Missing sellerId or referralCode";
    }

    // Send notification emails
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    // Send account created email to seller (NO PASSWORD - password will be sent on approval)
    console.log("=== SENDING ACCOUNT CREATED EMAIL ===");
    console.log("To:", email, "Name:", name);
    try {
      const result = await sendAccountCreatedToSeller(email, name);
      console.log("Account created email result:", result);
    } catch (e: any) {
      console.error("Failed to send account created email to seller:", e);
      console.error("Error message:", e?.message);
      console.error("Error stack:", e?.stack);
    }

    // Send notification to all admins
    try {
      // Try to get admins from 'admins' table first
      let { data: admins } = await supabase.from("admins").select("email");
      
      // If no admins found or table doesn't exist, try profiles table
      if (!admins || admins.length === 0) {
        console.log("No admins found in 'admins' table, trying 'profiles' table...");
        const { data: adminProfiles } = await supabase
          .from("profiles")
          .select("email")
          .eq("role", "admin");
        
        if (adminProfiles && adminProfiles.length > 0) {
          admins = adminProfiles;
        }
      }
      
      if (admins && admins.length > 0) {
        console.log(`Sending notifications to ${admins.length} admin(s)`);
        for (const admin of admins) {
          if (admin.email) {
            await sendNewSellerNotificationToAdmin(
              admin.email,
              name,
              email,
              phone,
              whatYouSell,
              hasLiveExperience
            );
            console.log("Admin notification sent to:", admin.email);
          }
        }
      } else {
        console.warn("No admin emails found to send notifications");
      }
    } catch (e) {
      console.error("Failed to send admin notifications:", e);
    }

    return NextResponse.json({
      success: true,
      message: "Account created successfully. You will receive login credentials once approved.",
      userId,
      waitlistId: waitlistData.id,
      referral: {
        code: referralCode,
        created: referralCreated,
        error: referralErrorMsg,
      },
    });
  } catch (error: any) {
    console.error("Waitlist signup error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
