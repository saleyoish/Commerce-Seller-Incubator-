'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClientSideSupabase } from '@/lib/supabase-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Radio, ChevronRight, ExternalLink, Loader2, CheckCircle } from 'lucide-react';

export default function StreamSettingsPage() {
  const [seller, setSeller] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSellerData();
  }, []);

  const loadSellerData = async () => {
    try {
      const res = await fetch('/api/auth/check-user', { credentials: 'omit' });
      if (!res.ok) { setIsLoading(false); return; }
      const userData = await res.json();
      if (!userData.user) { setIsLoading(false); return; }

      const { db: dbClient } = await import('@/lib/db');

      let sellerDataList = null;
      let sellerData = null;

      const { data: sellersById } = await dbClient
        .from('sellers')
        .select('restream_username, restream_stream_key')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });

      sellerDataList = sellersById;

      if ((!sellerDataList || sellerDataList.length === 0) && userData.user.email) {
        const { data: sellersByEmail } = await dbClient
          .from('sellers')
          .select('restream_username, restream_stream_key')
          .eq('email', userData.user.email)
          .order('created_at', { ascending: false });
        sellerDataList = sellersByEmail;
      }

      if (sellerDataList && sellerDataList.length > 0) {
        sellerData = sellerDataList.find((s: any) => s.restream_stream_key && 
                                           s.restream_stream_key !== 'NOT_CONFIGURED' && 
                                           s.restream_stream_key.length > 10);
        if (!sellerData) sellerData = sellerDataList[0];
      }

      setSeller(sellerData);
    } catch (error) {
      console.error('Error loading seller data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-6">
        {/* Multi-Stream / Restream Setup Card */}
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)] flex items-center gap-2">
              <Radio className="w-5 h-5 text-[var(--accent-primary)]" />
              Multi-Stream / Restream Setup
            </CardTitle>
            <CardDescription className="text-[var(--text-muted)]">
              Configure Restream.io for broadcasting to multiple platforms simultaneously
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/seller/streaming/setup">
              <div className="flex items-center justify-between p-4 border border-[var(--border-default)] rounded-lg hover:bg-[var(--bg-raised)] transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                    <Radio className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">Configure Restream.io</p>
                    <p className="text-sm text-[var(--text-muted)]">
                      Set up your stream key and broadcast to YouTube, Instagram, Facebook, and more
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)]" />
              </div>
            </Link>

            <div className="mt-4 p-4 bg-[var(--bg-raised)] rounded-lg border border-[var(--border-default)]">
              <h4 className="font-medium text-[var(--text-primary)] mb-2">What is Restream?</h4>
              <p className="text-sm text-[var(--text-muted)] mb-3">
                Restream allows you to broadcast your live stream to multiple platforms at once. 
                Connect your accounts and stream to YouTube, Facebook, Instagram, TikTok, and more simultaneously.
              </p>
              <a 
                href="https://restream.io" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[var(--accent-primary)] hover:underline text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Learn more about Restream.io
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Stream Status</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">
              Your current streaming configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-lg border ${seller?.restream_username && seller?.restream_stream_key ? 'bg-green-50 border-green-200' : 'bg-[var(--bg-raised)] border-[var(--border-default)]'}`}>
                <p className="text-sm text-[var(--text-muted)] mb-1">Restream Status</p>
                <div className="flex items-center gap-2">
                  {seller?.restream_username && seller?.restream_stream_key ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <p className="font-medium text-green-600">Fully Configured</p>
                    </>
                  ) : (
                    <p className="font-medium text-[var(--accent-primary)]">Not Connected</p>
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {seller?.restream_username && seller?.restream_stream_key ? (
                    <span className="text-green-600">Setup complete ✓</span>
                  ) : (
                    <Link href="/seller/streaming/setup" className="hover:underline">
                      Click to setup
                    </Link>
                  )}
                </p>
              </div>
              <div className={`p-4 rounded-lg border ${seller?.restream_username && seller?.restream_stream_key ? 'bg-green-50 border-green-200' : 'bg-[var(--bg-raised)] border-[var(--border-default)]'}`}>
                <p className="text-sm text-[var(--text-muted)] mb-1">Connected Platforms</p>
                <div className="flex items-center gap-2">
                  {seller?.restream_username && seller?.restream_stream_key ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <p className="font-medium text-green-600">Ready to Stream</p>
                    </>
                  ) : (
                    <p className="font-medium text-[var(--text-primary)]">0</p>
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {seller?.restream_username && seller?.restream_stream_key ? 
                    'Restream.io ready ✓' : 
                    'No platforms connected'
                  }
                </p>
              </div>
              <div className="p-4 bg-[var(--bg-raised)] rounded-lg border border-[var(--border-default)]">
                <p className="text-sm text-[var(--text-muted)] mb-1">Last Stream</p>
                <p className="font-medium text-[var(--text-primary)]">Never</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Start your first stream</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
