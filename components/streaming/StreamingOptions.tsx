'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { 
  Calendar, 
  Video, 
  Clock, 
  TrendingUp,
  Users,
  DollarSign,
  Settings,
  Play
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface StreamingOptionsProps {
  sellerId: string;
  children: React.ReactNode;
}

export function StreamingOptions({ sellerId, children }: StreamingOptionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleInstantLive = () => {
    setIsOpen(false);
    router.push('/seller/streaming/instant-live');
  };

  const handleScheduleLive = () => {
    setIsOpen(false);
    router.push('/seller/streaming/schedule');
  };

  const handleManageStreams = () => {
    setIsOpen(false);
    router.push('/seller/streaming/manage');
  };

  const handleAnalytics = () => {
    setIsOpen(false);
    router.push('/seller/analytics');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger>
        {children}
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Streaming Options
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instant Live */}
          <Button
            onClick={handleInstantLive}
            variant="default"
            size="lg"
            className="w-full h-16 flex items-center justify-start gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                <Play className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="font-semibold">🔴 Go Live Instant</div>
                <div className="text-xs text-gray-500">Start streaming immediately</div>
              </div>
            </div>
          </Button>

          {/* Schedule Live */}
          <Button
            onClick={handleScheduleLive}
            variant="outline"
            size="lg"
            className="w-full h-16 flex items-center justify-start gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="font-semibold">📅 Schedule Live</div>
                <div className="text-xs text-gray-500">Plan for future stream</div>
              </div>
            </div>
          </Button>

          {/* Manage Streams */}
          <Button
            onClick={handleManageStreams}
            variant="outline"
            size="lg"
            className="w-full h-16 flex items-center justify-start gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="font-semibold">⚙️ Manage Streams</div>
                <div className="text-xs text-gray-500">View and edit streams</div>
              </div>
            </div>
          </Button>

          {/* Analytics */}
          <Button
            onClick={handleAnalytics}
            variant="outline"
            size="lg"
            className="w-full h-16 flex items-center justify-start gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="font-semibold">📊 Analytics</div>
                <div className="text-xs text-gray-500">View stream performance</div>
              </div>
            </div>
          </Button>

          {/* Quick Stats */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Quick Stats</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">12</div>
                <div className="text-xs text-gray-500">Total Streams</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">3.2K</div>
                <div className="text-xs text-gray-500">Total Views</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">$847</div>
                <div className="text-xs text-gray-500">Revenue</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">4.8</div>
                <div className="text-xs text-gray-500">Avg Rating</div>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <Video className="w-4 h-4" />
              Streaming Tips
            </h4>
            <ul className="text-sm text-blue-800 space-y-2 list-disc list-inside">
              <li>🔴 <strong>Instant Live:</strong> Start streaming immediately with OBS</li>
              <li>📅 <strong>Schedule Live:</strong> Plan streams for specific times</li>
              <li>📱 <strong>Multi-platform:</strong> Stream to TikTok, YouTube, Facebook</li>
              <li>💰 <strong>Product Links:</strong> Add products to earn during streams</li>
              <li>📊 <strong>Analytics:</strong> Track performance and optimize</li>
            </ul>
          </div>

          {/* Close Button */}
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            className="w-full"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
