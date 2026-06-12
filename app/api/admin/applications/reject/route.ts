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

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Missing application ID" },
        { status: 400 }
      );
    }

    // Get application details using service role client
    const { data: application, error: fetchError } = await db
      .from("applications")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Update application status
    const { error: updateError } = await db
      .from("applications")
      .update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to reject application" },
        { status: 500 }
      );
    }

    // Send rejection email
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/email/application-rejected`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: application.email,
            name: application.full_name,
          }),
        }
      );
    } catch (e) {
      console.error("Failed to send rejection email:", e);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reject application error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
