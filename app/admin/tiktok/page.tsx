"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Store,
  Package,
  ShoppingCart,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Loader2,
} from "lucide-react";

export default function TikTokAdminPage() {
  const [connections, setConnections] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [recentSyncs, setRecentSyncs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTikTokData();
  }, []);

  const loadTikTokData = async () => {
    try {
      const res = await authFetch('/api/admin/tiktok');

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to load TikTok data');
      }

      const data = await res.json();
      setConnections(data.connections || []);
      setStats(data.stats);
      setRecentSyncs(data.recentSyncs || []);
    } catch (err: any) {
      console.error('Error loading TikTok data:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async (sellerId: string) => {
    try {
      const res = await authFetch('/api/admin/tiktok/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sellerId }),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to sync');
      }

      await loadTikTokData();
    } catch (err: any) {
      console.error('Error syncing:', err);
      alert(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">TikTok Shop Management</h1>
        <p className="text-gray-600">
          Monitor and manage TikTok Shop integrations across all sellers
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-gray-600">Connections</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.totalConnections ?? 0}</p>
            <p className="text-xs text-green-600">
              {stats?.activeConnections ?? 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-600" />
              <span className="text-sm text-gray-600">Products</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.totalProducts ?? 0}</p>
            <p className="text-xs text-green-600">
              {stats?.syncedProducts ?? 0} synced
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-orange-600" />
              <span className="text-sm text-gray-600">Orders</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.totalOrders ?? 0}</p>
            <p className="text-xs text-orange-600">{stats?.pendingOrders ?? 0} pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Connections Table */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>TikTok Shop Connections</CardTitle>
          <CardDescription>All seller connections to TikTok Shop</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Seller</TableHead>
                <TableHead>Shop Name</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Connected</TableHead>
                <TableHead>Last Sync</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {connections?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No TikTok Shop connections yet
                  </TableCell>
                </TableRow>
              ) : (
                connections?.map((conn: any) => (
                  <TableRow key={conn.id}>
                    <TableCell className="font-medium">
                      {conn.seller?.email}
                    </TableCell>
                    <TableCell>{conn.shop_name || "-"}</TableCell>
                    <TableCell>{conn.shop_region || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          conn.is_connected
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }
                      >
                        {conn.is_connected ? "Connected" : "Disconnected"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {conn.connected_at
                        ? new Date(conn.connected_at).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {conn.last_product_sync_at
                        ? new Date(conn.last_product_sync_at).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {conn.is_connected && (
                          <>
                            <Button
                              onClick={() => handleSync(conn.seller_id)}
                              size="sm"
                              variant="outline"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                            <a
                              href={`https://seller-us.tiktok.com/shop/${conn.tiktok_shop_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button size="sm" variant="outline">
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </a>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Syncs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sync Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Success</TableHead>
                <TableHead>Failed</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentSyncs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No sync operations yet
                  </TableCell>
                </TableRow>
              ) : (
                recentSyncs?.map((sync: any) => (
                  <TableRow key={sync.id}>
                    <TableCell className="capitalize">
                      {sync.sync_type.replace("_", " ")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          sync.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : sync.status === "failed"
                            ? "bg-red-100 text-red-800"
                            : "bg-blue-100 text-blue-800"
                        }
                      >
                        {sync.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{sync.items_total || "-"}</TableCell>
                    <TableCell className="text-green-600">
                      {sync.items_success || "-"}
                    </TableCell>
                    <TableCell className="text-red-600">
                      {sync.items_failed || "-"}
                    </TableCell>
                    <TableCell>
                      {new Date(sync.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
