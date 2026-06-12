import { createAdminSupabase } from "@/lib/supabase-admin";
import { getValidAccessToken } from "@/lib/token-refresh";

// ============================================
// BACKGROUND SYNC SERVICE
// ============================================

export async function scheduleBackgroundSync(sellerId: string, platform: string) {
  // This would typically use a job scheduler like Bull, Agenda, or Vercel Cron
  // For now, we'll implement a simple interval-based approach
  
  const syncInterval = 30 * 60 * 1000; // 30 minutes
  
  // In production, this would be stored in a database and processed by a worker
  console.log(`Scheduled background sync for ${platform} (seller: ${sellerId}) every ${syncInterval / 60000} minutes`);
}

export async function performBackgroundSync(sellerId: string, platform: string) {
  const supabase = createAdminSupabase();

  try {
    // Check if sync is enabled for this connection
    const { data: connection } = await supabase
      .from("platform_connections")
      .select("*")
      .eq("seller_id", sellerId)
      .eq("platform", platform)
      .eq("status", "connected")
      .single();

    if (!connection || !connection.sync_enabled) {
      console.log(`Sync disabled for ${platform} (seller: ${sellerId})`);
      return;
    }

    // Get valid access token
    const accessToken = await getValidAccessToken(sellerId, platform);
    if (!accessToken) {
      console.error(`No valid access token for ${platform} (seller: ${sellerId})`);
      return;
    }

    // Perform sync based on platform
    const syncUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/${platform}/sync-products`;
    
    const response = await fetch(`${syncUrl}?sellerId=${sellerId}&syncType=pull`, {
      method: "POST",
    });

    if (!response.ok) {
      console.error(`Background sync failed for ${platform} (seller: ${sellerId})`);
      return;
    }

    const result = await response.json();
    console.log(`Background sync completed for ${platform} (seller: ${sellerId}):`, result);
  } catch (error) {
    console.error(`Background sync error for ${platform} (seller: ${sellerId}):`, error);
  }
}

// ============================================
// SYNC ALL PLATFORMS FOR A SELLER
// ============================================

export async function syncAllPlatforms(sellerId: string) {
  const platforms = ['tiktok', 'whatnot', 'meta'];
  
  for (const platform of platforms) {
    try {
      await performBackgroundSync(sellerId, platform);
    } catch (error) {
      console.error(`Failed to sync ${platform} for seller ${sellerId}:`, error);
    }
  }
}

// ============================================
// SCHEDULED SYNC JOB (for Vercel Cron or similar)
// ============================================

export async function scheduledSyncJob() {
  const supabase = createAdminSupabase();

  // Get all sellers with active connections
  const { data: connections } = await supabase
    .from("platform_connections")
    .select("seller_id, platform")
    .eq("status", "connected")
    .eq("sync_enabled", true);

  if (!connections) return;

  // Group by seller
  const sellersMap = new Map<string, string[]>();
  for (const connection of connections) {
    if (!sellersMap.has(connection.seller_id)) {
      sellersMap.set(connection.seller_id, []);
    }
    sellersMap.get(connection.seller_id)!.push(connection.platform);
  }

  // Sync each seller's platforms
  for (const [sellerId, platforms] of sellersMap) {
    for (const platform of platforms) {
      try {
        await performBackgroundSync(sellerId, platform);
      } catch (error) {
        console.error(`Scheduled sync failed for ${platform} (seller: ${sellerId}):`, error);
      }
    }
  }
}

// ============================================
// MANUAL SYNC TRIGGER
// ============================================

export async function triggerManualSync(sellerId: string, platform: string) {
  return performBackgroundSync(sellerId, platform);
}
