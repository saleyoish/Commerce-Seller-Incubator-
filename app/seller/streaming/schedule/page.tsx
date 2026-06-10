'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  Video, 
  ArrowLeft,
  Plus,
  ChevronRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ScheduleLivePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [streamTitle, setStreamTitle] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const router = useRouter();

  useEffect(() => {
    checkRestreamStatus();
  }, []);

  useEffect(() => {
    if (!isLoading && isConnected) {
      router.push('/seller/schedule');
    }
  }, [isLoading, isConnected, router]);

  const checkRestreamStatus = async () => {
    try {
      const response = await fetch('/api/seller/restream-status');
      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.connected);
      }
    } catch (error) {
      console.error('Failed to check Restream status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScheduleStream = () => {
    router.push('/seller/schedule');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] py-12 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-[var(--text-muted)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] py-12">
        <div className="max-w-2xl mx-auto px-4">
          <Card className="bg-[var(--bg-surface)] border-[var(--border-default)]">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-yellow-500" />
              </div>
              <CardTitle className="text-2xl text-[var(--text-primary)]">Connect Restream First</CardTitle>
              <CardDescription className="text-[var(--text-secondary)]">
                You need to connect your Restream account before scheduling streams
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Button
                onClick={() => router.push('/seller/restream-setup')}
                className="w-full h-14"
                size="lg"
              >
                <Video className="w-5 h-5 mr-2" />
                Setup Restream
                <ChevronRight className="w-5 h-5 ml-auto" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/seller')}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">📅 Schedule Live</h1>
            <p className="text-[var(--text-secondary)]">Plan your upcoming live streams</p>
          </div>
        </div>

        {/* Coming Soon Notice */}
        <Card className="bg-[var(--bg-surface)] border-[var(--border-default)] mb-6">
          <CardHeader>
            <CardTitle className="text-xl text-[var(--text-primary)] flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Coming Soon
            </CardTitle>
            <CardDescription className="text-[var(--text-secondary)]">
              Stream scheduling will be available in the next update
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-blue-400 text-sm">
                We're working on an advanced scheduling system that will let you:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-[var(--text-secondary)] list-disc list-inside">
                <li>Schedule streams in advance</li>
                <li>Set automatic reminders</li>
                <li>Notify your followers</li>
                <li>Plan multi-platform broadcasts</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Quick Action */}
        <Card className="bg-[var(--bg-surface)] border-[var(--border-default)]">
          <CardHeader>
            <CardTitle className="text-lg text-[var(--text-primary)]">Want to stream now?</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push('/seller/streaming/instant-live')}
              className="w-full h-14"
              size="lg"
            >
              <Video className="w-5 h-5 mr-2" />
              Go Live Now
              <ChevronRight className="w-5 h-5 ml-auto" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
