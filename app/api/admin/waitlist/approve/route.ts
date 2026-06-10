import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { hashPassword, generateTempPassword } from "@/lib/password";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const id = formData.get("id") as string;

    if (!id) {
      return NextResponse.json(
        { error: "Missing waitlist ID" },
        { status: 400 }
      );
    }

    const { data: waitlistEntry, error: fetchError } = await db
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

    const password = generateTempPassword();
    const passwordHash = await hashPassword(password);
    let userId = waitlistEntry.user_id || uuidv4();

    const { data: existingSellerById } = await db
      .from("sellers")
      .select("id, user_id, email")
      .eq("user_id", userId)
      .maybeSingle();

    let sellerExists = !!existingSellerById;

    if (!sellerExists) {
      const { data: existingSellerByEmail } = await db
        .from("sellers")
        .select("id, user_id")
        .eq("email", waitlistEntry.email)
        .maybeSingle();

      if (existingSellerByEmail?.user_id) {
        userId = existingSellerByEmail.user_id;
        sellerExists = true;
      }
    }

    const sellerPayload: Record<string, any> = {
      user_id: userId,
      email: waitlistEntry.email,
      phone: waitlistEntry.phone,
      approval_status: "approved",
      stripe_onboarding_status: "pending",
      password_hash: passwordHash,
      is_temp_password: true,
      updated_at: new Date().toISOString(),
      name: waitlistEntry.name || null,
    };

    if (sellerExists) {
      await db.from("sellers").update(sellerPayload).eq("user_id", userId);
    } else {
      await db.from("sellers").insert(sellerPayload);
    }

    await db
      .from("waitlist")
      .update({
        status: "approved",
        updated_at: new Date().toISOString(),
        user_id: userId,
      })
      .eq("id", id);

    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/email/waitlist-approved`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: waitlistEntry.email,
            name: waitlistEntry.name || waitlistEntry.email,
            email: waitlistEntry.email,
            password,
          }),
        }
      );
    } catch (e: any) {
      console.error("Failed to send approval email:", e);
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
