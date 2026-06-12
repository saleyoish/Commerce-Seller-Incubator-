import { scheduledSyncJob } from "@/lib/marketplace-sync";
import { NextResponse } from "next/server";

// This endpoint is designed to be called by Vercel Cron or similar scheduling services
// It will sync all active marketplace connections

export async function GET(request: Request) {
  try {
    // Verify this is a cron job call (you should add authentication in production)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Perform scheduled sync
    await scheduledSyncJob();

    return NextResponse.json({ 
      success: true,
      message: "Scheduled sync completed" 
    });
  } catch (error) {
    console.error("Scheduled sync error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
