"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Store,
  Link2,
  RefreshCw,
  Package,
  ShoppingCart,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Clock,
} from "lucide-react";

interface TikTokConnection {
  id: string;
  shop_name: string;
  shop_region: string;
  shop_status: string;
  is_connected: boolean;
  connected_at: string;
  last_product_sync_at: string | null;
  last_order_sync_at: string | null;
  scopes: string[];
  access_token?: string;
}

interface SyncStats {
  totalProducts: number;
  syncedProducts: number;
  failedProducts: number;
  totalOrders: number;
  recentOrders: number;
  pendingOrders: number;
}

export default function TikTokShopPage() {
  const [connection, setConnection] = useState<TikTokConnection | null>(null);
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load connection status
      const statusRes = await fetch("/api/tiktok/connection-status");
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setConnection(statusData.connection);
        
        // Set connecting state if there's a pending connection
        if (statusData.status === "pending") {
          setIsConnecting(true);
        } else {
          setIsConnecting(false);
        }
      }

      // Load stats
      const statsRes = await fetch("/api/tiktok/stats");
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      setError("Failed to load TikTok Shop data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      const res = await fetch("/api/tiktok/connect", { method: "POST" });
      const data = await res.json();

      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else if (data.demoMode) {
        // Demo mode - simulate connection
        handleDemoConnect();
      } else {
        setError(data.error || "Failed to get TikTok authorization URL");
        setIsConnecting(false);
      }
    } catch (err) {
      setError("Failed to initiate connection");
      setIsConnecting(false);
    }
  };

  const handleCancelConnection = async () => {
    if (!confirm("Are you sure you want to cancel the pending connection?")) {
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/tiktok/cancel-connection", {
        method: "POST",
      });

      if (res.ok) {
        setSuccessMessage("Connection cancelled successfully");
        setIsConnecting(false);
        await loadData();
      } else {
        throw new Error("Failed to cancel connection");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoConnect = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/tiktok/demo-connect", { method: "POST" });
      const data = await res.json();

      if (data.success) {
        setSuccessMessage("Demo mode: Simulated TikTok Shop connected!");
        await loadData();
      } else {
        setError("Failed to create demo connection");
      }
    } catch (err) {
      setError("Demo connection failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async (type: "products" | "orders") => {
    try {
      setIsSyncing(true);
      setError(null);

      const res = await fetch(`/api/tiktok/sync-${type}`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Failed to sync ${type}`);
      }

      setSuccessMessage(
        `Sync completed: ${data.successCount || data.new} ${type} synced`
      );

      // Refresh data
      await loadData();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleReconnect = async () => {
    if (!confirm("Are you sure you want to reconnect your TikTok Shop? This will refresh your authorization.")) {
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);
      const res = await fetch("/api/tiktok/reconnect", { method: "POST" });
      const data = await res.json();

      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else if (data.demoMode) {
        // Demo mode - simulate reconnection
        handleDemoConnect();
      } else {
        setError(data.error || "Failed to get TikTok authorization URL");
        setIsConnecting(false);
      }
    } catch (err) {
      setError("Failed to initiate reconnection");
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect your TikTok Shop?")) {
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/tiktok/disconnect", {
        method: "POST",
      });

      if (res.ok) {
        setConnection(null);
        setSuccessMessage("TikTok Shop disconnected successfully");
      } else {
        throw new Error("Failed to disconnect");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
            <p className="mt-4 text-gray-600">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">TikTok Shop</h1>
        <p className="text-gray-600">
          Connect your TikTok Shop to sync products and orders automatically
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {!connection?.is_connected ? (
        // Not connected state
        <Card className="border-2 border-dashed border-gray-300">
          <CardContent className="p-12 text-center">
            {!isConnecting ? (
              <>
                <Store className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h2 className="text-xl font-semibold mb-2">
                  Connect Your TikTok Shop
                </h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Link your TikTok Shop to automatically sync products, track orders,
                  and manage inventory across both platforms.
                </p>
                <Button
                  size="lg"
                  onClick={handleConnect}
                  className="bg-black hover:bg-gray-800"
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  Connect TikTok Shop
                </Button>
                <p className="text-sm text-gray-500 mt-4">
                  Requires TikTok Shop Seller Account
                </p>
              </>
            ) : (
              <>
                <RefreshCw className="w-16 h-16 mx-auto text-blue-500 mb-4 animate-spin" />
                <h2 className="text-xl font-semibold mb-2">
                  Connection in Progress
                </h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  You'll be redirected to TikTok to authorize the connection.
                  If you changed your mind, you can cancel below.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button
                    variant="outline"
                    onClick={handleCancelConnection}
                    disabled={isLoading}
                  >
                    Cancel Connection
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  Waiting for TikTok authorization...
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        // Connected state
        <>
          {/* Shop Info Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
                    <Store className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle>{connection.shop_name || "TikTok Shop"}</CardTitle>
                    <CardDescription>
                      {connection.shop_region} • Connected{" "}
                      {new Date(connection.connected_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {connection.access_token === "demo_token" && (
                    <Badge className="bg-purple-100 text-purple-800">
                      DEMO MODE
                    </Badge>
                  )}
                  <Badge
                    className={
                      connection.shop_status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }
                  >
                    {connection.shop_status}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReconnect}
                    disabled={isConnecting}
                  >
                    <RefreshCw className={`w-4 h-4 mr-1 ${isConnecting ? "animate-spin" : ""}`} />
                    Reconnect
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnect}
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {connection.scopes?.map((scope) => (
                  <Badge key={scope} variant="secondary" className="capitalize">
                    {scope}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    <span className="text-sm text-gray-600">Products Synced</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">
                    {stats.syncedProducts}/{stats.totalProducts}
                  </p>
                  <Progress
                    value={
                      stats.totalProducts
                        ? (stats.syncedProducts / stats.totalProducts) * 100
                        : 0
                    }
                    className="h-1 mt-2"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-gray-600">Total Orders</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{stats.totalOrders}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-600" />
                    <span className="text-sm text-gray-600">Pending</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{stats.pendingOrders}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    <span className="text-sm text-gray-600">Recent (24h)</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{stats.recentOrders}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Sync Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Sync Actions</CardTitle>
              <CardDescription>
                Manually sync your data with TikTok Shop
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <Button
                onClick={() => handleSync("products")}
                disabled={isSyncing}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
                Sync Products
              </Button>

              <Button
                onClick={() => handleSync("orders")}
                disabled={isSyncing}
                variant="outline"
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
                Sync Orders
              </Button>

              <a
                href="https://seller-us.tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" className="gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Open TikTok Seller Center
                </Button>
              </a>
            </CardContent>
          </Card>

          {/* Last Sync Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Last Sync</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  Products:{" "}
                  {connection.last_product_sync_at
                    ? new Date(connection.last_product_sync_at).toLocaleString()
                    : "Never"}
                </p>
                <p>
                  Orders:{" "}
                  {connection.last_order_sync_at
                    ? new Date(connection.last_order_sync_at).toLocaleString()
                    : "Never"}
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
