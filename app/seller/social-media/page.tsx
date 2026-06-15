'use client';

import { useEffect, useState } from 'react';
import { createClientSideSupabase, type SocialMediaAccount } from "@/lib/supabase-client";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Play, Camera, Link2, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function SocialMediaConnectionsPage() {
  const [accounts, setAccounts] = useState<SocialMediaAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const response = await fetch('/api/content/social-media/accounts');
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAutoPost = async (accountId: string, currentValue: boolean) => {
    setIsUpdating(accountId);
    try {
      const supabase = createClientSideSupabase();
      const { error } = await supabase
        .from('social_media_accounts')
        .update({ auto_post_enabled: !currentValue })
        .eq('id', accountId);

      if (!error) {
        setAccounts(accounts.map(acc => 
          acc.id === accountId ? { ...acc, auto_post_enabled: !currentValue } : acc
        ));
      }
    } catch (error) {
      console.error('Error toggling auto-post:', error);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleConnect = (platform: string) => {
    if (platform === 'youtube') {
      window.location.href = '/api/auth/youtube';
    } else if (platform === 'instagram') {
      window.location.href = '/api/auth/instagram';
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'youtube':
        return <Play className="h-6 w-6 text-red-600" />;
      case 'instagram':
        return <Camera className="h-6 w-6 text-pink-600" />;
      default:
        return <Link2 className="h-6 w-6" />;
    }
  };

  const getAccountForPlatform = (platform: string) => {
    return accounts.find(acc => acc.platform === platform);
  };

  const platforms = [
    { id: 'youtube', name: 'YouTube', description: 'Post clips as YouTube Shorts', connected: !!getAccountForPlatform('youtube') },
    { id: 'instagram', name: 'Instagram', description: 'Post clips as Instagram Reels', connected: !!getAccountForPlatform('instagram') },
    { id: 'tiktok', name: 'TikTok', description: 'Post clips to TikTok', connected: !!getAccountForPlatform('tiktok'), disabled: true },
  ];

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Link2 className="h-8 w-8" />
          Social Media Connections
        </h1>
        <p className="text-gray-600 mt-2">
          Connect your social media accounts to auto-post approved clips
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {platforms.map((platform) => {
          const account = getAccountForPlatform(platform.id);
          
          return (
            <Card key={platform.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getPlatformIcon(platform.id)}
                    <div>
                      <CardTitle>{platform.name}</CardTitle>
                      <CardDescription>{platform.description}</CardDescription>
                    </div>
                  </div>
                  {account ? (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  ) : platform.disabled ? (
                    <Badge variant="secondary">Coming Soon</Badge>
                  ) : (
                    <Badge variant="outline">
                      <XCircle className="h-3 w-3 mr-1" />
                      Not Connected
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {account ? (
                  <>
                    <div className="flex items-center justify-between py-2 border-t">
                      <span className="text-sm font-medium">Username</span>
                      <span className="text-sm text-gray-600">@{account.platform_username || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-t">
                      <span className="text-sm font-medium">Auto-Post</span>
                      <div className="flex items-center gap-2">
                        {isUpdating === account.id && <Loader2 className="h-4 w-4 animate-spin" />}
                        <Switch
                          checked={account.auto_post_enabled}
                          onCheckedChange={() => handleToggleAutoPost(account.id, account.auto_post_enabled)}
                          disabled={isUpdating === account.id}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-2 border-t">
                      <span className="text-sm font-medium">Connected</span>
                      <span className="text-sm text-gray-600">
                        {new Date(account.connected_at || account.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => handleConnect(platform.id)}
                    >
                      Reconnect Account
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-500 py-2">
                      Connect your {platform.name} account to automatically post approved clips.
                    </p>
                    <Button
                      className="w-full"
                      onClick={() => handleConnect(platform.id)}
                      disabled={platform.disabled}
                    >
                      {platform.disabled ? 'Coming Soon' : `Connect ${platform.name}`}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Card */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>1. Connect your social media accounts</p>
          <p>2. Enable auto-post for each platform</p>
          <p>3. When clips are generated, they enter the moderation queue</p>
          <p>4. Approved clips are automatically posted to your connected platforms</p>
          <p>5. Track performance in the analytics dashboard</p>
        </CardContent>
      </Card>
    </div>
  );
}
