import { db } from "@/lib/db";
import { verifyJWT } from "@/lib/jwt";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyJWT(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Verify user is admin
    const { data: admin } = await db
      .from('admins')
      .select('id')
      .eq('id', decoded.userId)
      .maybeSingle();

    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const formData = await request.formData();
    const id = formData.get("id") as string;

    if (!id) {
      return NextResponse.json(
        { error: "Missing referral ID" },
        { status: 400 }
      );
    }

    // Update referral as paid using service role client
    const { error } = await db
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
