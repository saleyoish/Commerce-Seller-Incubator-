"use client";

import { useEffect, useState } from "react";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw, 
  Link2, 
  Unlink,
  ShoppingBag,
  Store,
  Facebook,
  Instagram
} from "lucide-react";
import { authFetch } from '@/lib/auth';

interface ConnectionStatus {
  connected: boolean;
  status: string;
  connectedAt?: string;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  lastSyncTime?: string;
  productCount: number;
  platformUsername?: string;
  syncEnabled: boolean;
}

interface PlatformData {
  name: string;
  platform: string;
  icon: React.ReactNode;
  color: string;
  status: ConnectionStatus;
}

export default function MarketplacePage() {
  const [statuses, setStatuses] = useState<Record<string, ConnectionStatus>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchStatuses();
  }, []);

  const fetchStatuses = async () => {
    try {
      const res = await authFetch('/api/marketplace/status', {
        credentials: 'omit',
      });
      if (res.ok) {
        const data = await res.json();
        setStatuses(data.statuses);
      }
    } catch (error) {
      console.error('Failed to fetch statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (platform: string) => {
    try {
      let url: string;
      
      if (platform === "tiktok") {
        const res = await authFetch('/api/tiktok/connect', { method: 'POST', credentials: 'omit' });
        const data = await res.json();
        if (data.authUrl) {
          window.location.href = data.authUrl;
        } else if (data.demoMode) {
          // Handle demo mode
          alert('TikTok API not configured - demo mode would be triggered here');
        }
      } else if (platform === "meta") {
        const res = await authFetch('/api/meta/connect', { method: 'POST', credentials: 'omit' });
        const data = await res.json();
        if (data.authUrl) {
          window.location.href = data.authUrl;
        } else if (data.demoMode) {
          alert("Meta API not configured - demo mode would be triggered here");
        }
      } else if (platform === "whatnot") {
        // For Whatnot, show a modal to enter API token
        const token = prompt("Enter your Whatnot API token:");
        if (token) {
          const res = await authFetch('/api/whatnot/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken: token }),
            credentials: 'omit',
          });
          if (res.ok) {
            fetchStatuses();
          }
        }
      }
    } catch (error) {
      console.error("Connect error:", error);
      alert("Failed to connect platform");
    }
  };

  const handleDisconnect = async (platform: string) => {
    if (!confirm(`Are you sure you want to disconnect ${platform}?`)) return;

    try {
      const res = await authFetch('/api/marketplace/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
        credentials: 'omit',
      });

      if (res.ok) {
        fetchStatuses();
      } else {
        alert("Failed to disconnect platform");
      }
    } catch (error) {
      console.error("Disconnect error:", error);
      alert("Failed to disconnect platform");
    }
  };

  const handleSync = async (platform: string, syncType: string = "pull") => {
    setSyncing((prev) => ({ ...prev, [platform]: true }));

    try {
      const res = await authFetch('/api/marketplace/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, syncType }),
        credentials: 'omit',
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Sync completed: ${data.successCount} products synced, ${data.failed} failed`);
        fetchStatuses();
      } else {
        const data = await res.json();
        alert(`Sync failed: ${data.error}`);
      }
    } catch (error) {
      console.error("Sync error:", error);
      alert("Failed to sync products");
    } finally {
      setSyncing((prev) => ({ ...prev, [platform]: false }));
    }
  };

  const platforms: PlatformData[] = [
    {
      name: "TikTok Shop",
      platform: "tiktok",
      icon: <ShoppingBag className="w-5 h-5" />,
      color: "bg-pink-500",
      status: statuses.tiktok || {
        connected: false,
        status: "disconnected",
        productCount: 0,
        syncEnabled: true,
      },
    },
    {
      name: "Whatnot",
      platform: "whatnot",
      icon: <Store className="w-5 h-5" />,
      color: "bg-purple-500",
      status: statuses.whatnot || {
        connected: false,
        status: "disconnected",
        productCount: 0,
        syncEnabled: true,
      },
    },
    {
      name: "Meta Commerce",
      platform: "meta",
      icon: <Facebook className="w-5 h-5" />,
      color: "bg-blue-600",
      status: statuses.meta || {
        connected: false,
        status: "disconnected",
        productCount: 0,
        syncEnabled: true,
      },
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Marketplace Integration</h1>
        <p className="text-gray-600 mt-1">
          Connect and manage your marketplace accounts to sync products across platforms
        </p>
      </div>

      {/* Platform Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {platforms.map((platform) => (
          <div
            key={platform.platform}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
          >
            {/* Header */}
            <div className={`${platform.color} px-6 py-4 flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className="text-white">{platform.icon}</div>
                <h3 className="text-lg font-semibold text-white">{platform.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                {platform.status.connected ? (
                  <div className="flex items-center gap-1 text-white text-sm">
                    <CheckCircle className="w-4 h-4" />
                    <span>Connected</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-white text-sm">
                    <XCircle className="w-4 h-4" />
                    <span>Disconnected</span>
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Account Info */}
              {platform.status.connected && platform.status.platformUsername && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Account:</span>
                  <span className="font-medium text-gray-900">
                    {platform.status.platformUsername}
                  </span>
                </div>
              )}

              {/* Product Count */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Synced Products:</span>
                <span className="font-medium text-gray-900">
                  {platform.status.productCount}
                </span>
              </div>

              {/* Last Sync */}
              {platform.status.lastSyncTime && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Last Sync:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(platform.status.lastSyncTime).toLocaleString()}
                  </span>
                </div>
              )}

              {/* Sync Status */}
              {platform.status.lastSyncStatus && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Sync Status:</span>
                  <span
                    className={`font-medium ${
                      platform.status.lastSyncStatus === "completed"
                        ? "text-green-600"
                        : platform.status.lastSyncStatus === "failed"
                        ? "text-red-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {platform.status.lastSyncStatus}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t border-gray-200 flex gap-2">
                {platform.status.connected ? (
                  <>
                    <button
                      onClick={() => handleSync(platform.platform, "pull")}
                      disabled={syncing[platform.platform]}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <RefreshCw className={`w-4 h-4 ${syncing[platform.platform] ? "animate-spin" : ""}`} />
                      <span>Sync Products</span>
                    </button>
                    <button
                      onClick={() => handleDisconnect(platform.platform)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Unlink className="w-4 h-4" />
                      <span>Disconnect</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleConnect(platform.platform)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Link2 className="w-4 h-4" />
                    <span>Connect</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">About Marketplace Integration</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• <strong>TikTok Shop:</strong> Connect your TikTok Shop to sync products and manage inventory</li>
          <li>• <strong>Whatnot:</strong> Connect your Whatnot seller account using your API token</li>
          <li>• <strong>Meta Commerce:</strong> Connect Facebook & Instagram Shops to sync products across platforms</li>
          <li>• Products synced from marketplaces will appear in your Products dashboard</li>
          <li>• Automatic sync can be enabled for real-time inventory updates</li>
        </ul>
      </div>
    </div>
  );
}
