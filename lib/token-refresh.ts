import { createAdminSupabase } from "@/lib/supabase-admin";
import { refreshAccessToken as refreshTikTokToken } from "@/lib/tiktok-api";
import { exchangeShortLivedToken as refreshMetaToken } from "@/lib/meta-service";

interface TokenRefreshResult {
  success: boolean;
  newAccessToken?: string;
  newRefreshToken?: string;
  expiresAt?: Date;
  error?: string;
}

// ============================================
// TIKTOK TOKEN REFRESH
// ============================================

export async function refreshTikTokAccessToken(connectionId: string): Promise<TokenRefreshResult> {
  const supabase = createAdminSupabase();

  try {
    // Get connection
    const { data: connection, error } = await supabase
      .from("platform_connections")
      .select("*")
      .eq("id", connectionId)
      .single();

    if (error || !connection) {
      return { success: false, error: "Connection not found" };
    }

    if (!connection.refresh_token) {
      return { success: false, error: "No refresh token available" };
    }

    // Refresh token
    const tokens = await refreshTikTokToken(connection.refresh_token);

    // Calculate new expiration
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in);

    // Update connection with new tokens
    await supabase
      .from("platform_connections")
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
        last_error: null,
        last_error_at: null,
      })
      .eq("id", connectionId);

    return {
      success: true,
      newAccessToken: tokens.access_token,
      newRefreshToken: tokens.refresh_token,
      expiresAt,
    };
  } catch (error) {
    console.error("TikTok token refresh error:", error);
    
    // Update connection with error
    await supabase
      .from("platform_connections")
      .update({
        status: "error",
        last_error: error instanceof Error ? error.message : "Token refresh failed",
        last_error_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", connectionId);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Token refresh failed",
    };
  }
}

// ============================================
// META TOKEN REFRESH
// ============================================

export async function refreshMetaAccessToken(connectionId: string): Promise<TokenRefreshResult> {
  const supabase = createAdminSupabase();

  try {
    // Get connection
    const { data: connection, error } = await supabase
      .from("platform_connections")
      .select("*")
      .eq("id", connectionId)
      .single();

    if (error || !connection) {
      return { success: false, error: "Connection not found" };
    }

    if (!connection.access_token) {
      return { success: false, error: "No access token available" };
    }

    // Meta tokens are long-lived (60 days) and can be refreshed using the same token
    // We'll exchange the current token for a new long-lived token
    const tokens = await refreshMetaToken(
      process.env.META_APP_ID,
      process.env.META_APP_SECRET,
      connection.access_token
    );

    // Calculate new expiration (60 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 60);

    // Update connection with new token
    await supabase
      .from("platform_connections")
      .update({
        access_token: tokens.access_token,
        token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
        last_error: null,
        last_error_at: null,
      })
      .eq("id", connectionId);

    return {
      success: true,
      newAccessToken: tokens.access_token,
      expiresAt,
    };
  } catch (error) {
    console.error("Meta token refresh error:", error);
    
    // Update connection with error
    await supabase
      .from("platform_connections")
      .update({
        status: "error",
        last_error: error instanceof Error ? error.message : "Token refresh failed",
        last_error_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", connectionId);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Token refresh failed",
    };
  }
}

// ============================================
// WHATNOT TOKEN REFRESH
// ============================================

export async function refreshWhatnotAccessToken(connectionId: string): Promise<TokenRefreshResult> {
  // Whatnot uses API tokens that don't expire, so no refresh needed
  return {
    success: true,
    error: "Whatnot tokens don't expire",
  };
}

// ============================================
// GENERIC TOKEN REFRESH
// ============================================

export async function refreshPlatformToken(platform: string, connectionId: string): Promise<TokenRefreshResult> {
  switch (platform) {
    case "tiktok":
      return refreshTikTokAccessToken(connectionId);
    case "meta":
    case "facebook":
    case "instagram":
      return refreshMetaAccessToken(connectionId);
    case "whatnot":
      return refreshWhatnotAccessToken(connectionId);
    default:
      return { success: false, error: "Unsupported platform" };
  }
}

// ============================================
// CHECK AND REFRESH EXPIRED TOKENS
// ============================================

export async function checkAndRefreshExpiredTokens(sellerId: string): Promise<void> {
  const supabase = createAdminSupabase();

  // Get all connections for seller
  const { data: connections } = await supabase
    .from("platform_connections")
    .select("*")
    .eq("seller_id", sellerId)
    .eq("status", "connected");

  if (!connections) return;

  const now = new Date();

  for (const connection of connections) {
    // Check if token is expired or will expire in the next 24 hours
    if (connection.token_expires_at) {
      const expiresAt = new Date(connection.token_expires_at);
      const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilExpiry < 24) {
        console.log(`Refreshing ${connection.platform} token for seller ${sellerId}`);
        await refreshPlatformToken(connection.platform, connection.id);
      }
    }
  }
}

// ============================================
// GET VALID ACCESS TOKEN
// ============================================

export async function getValidAccessToken(sellerId: string, platform: string): Promise<string | null> {
  const supabase = createAdminSupabase();

  // Get connection
  const { data: connection } = await supabase
    .from("platform_connections")
    .select("*")
    .eq("seller_id", sellerId)
    .eq("platform", platform)
    .eq("status", "connected")
    .single();

  if (!connection || !connection.access_token) {
    return null;
  }

  // Check if token needs refresh
  if (connection.token_expires_at) {
    const expiresAt = new Date(connection.token_expires_at);
    const now = new Date();
    const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilExpiry < 24) {
      // Refresh token
      const result = await refreshPlatformToken(platform, connection.id);
      if (result.success && result.newAccessToken) {
        return result.newAccessToken;
      }
    }
  }

  return connection.access_token;
}
