'use client';

import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Copy, 
  ExternalLink, 
  Loader2, 
  Video, 
  VideoOff,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { OBSConfig, StreamSession } from '@/types/streaming';
import { STREAMING_CONSTANTS } from '@/constants/streaming';

interface OBSModalProps {
  isOpen: boolean;
  onClose: () => void;
  streamSession: StreamSession | null;
  obsConfig: OBSConfig | null;
  onOpenOBS: (obsPath: string) => void;
}

export function OBSModal({ 
  isOpen, 
  onClose, 
  streamSession, 
  obsConfig, 
  onOpenOBS 
}: OBSModalProps) {
  const [copied, setCopied] = useState(false);
  const [obsPath, setObsPath] = useState('');
  const [isOpening, setIsOpening] = useState(false);

  // Auto-detect OBS path on mount
  useEffect(() => {
    detectObsPath();
  }, []);

  const detectObsPath = () => {
    const paths = STREAMING_CONSTANTS.OBS.DEFAULT_PATHS.WINDOWS;
    for (const path of paths) {
      // In a real implementation, you'd check if the file exists
      // For now, default to the first path
      setObsPath(path);
      break;
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleOpenOBS = async () => {
    if (!obsPath) return;
    
    setIsOpening(true);
    try {
      await onOpenOBS(obsPath);
    } catch (error) {
      console.error('Failed to open OBS:', error);
    } finally {
      setIsOpening(false);
    }
  };

  const getStatusIcon = () => {
    if (!streamSession) return <AlertCircle className="w-4 h-4" />;
    
    switch (streamSession.status) {
      case 'pending':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'live':
        return <Video className="w-4 h-4 text-red-500" />;
      case 'ended':
        return <VideoOff className="w-4 h-4" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = () => {
    if (!streamSession) return 'bg-gray-100 text-gray-800';
    
    switch (streamSession.status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'live':
        return 'bg-red-100 text-red-800';
      case 'ended':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = () => {
    if (!streamSession) return 'Unknown';
    
    switch (streamSession.status) {
      case 'pending':
        return '⏳ Waiting for OBS connection...';
      case 'live':
        return '🔴 LIVE NOW';
      case 'ended':
        return '✅ Stream ended';
      case 'error':
        return '❌ Stream error';
      default:
        return streamSession.status;
    }
  };

  if (!streamSession || !obsConfig) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Stream Configuration
          </DialogTitle>
          <DialogDescription>
            Configure OBS to start your live stream
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Stream Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-semibold">Stream Status</h3>
              <p className="text-sm text-gray-600">{getStatusText()}</p>
            </div>
            <Badge className={getStatusColor()}>
              {streamSession.status}
            </Badge>
          </div>

          {/* OBS Configuration */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Video className="w-4 h-4" />
              OBS Configuration
            </h3>

            {/* Server URL */}
            <div className="space-y-2">
              <Label htmlFor="server">RTMP Server</Label>
              <div className="flex gap-2">
                <Input
                  id="server"
                  value={obsConfig.server}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(obsConfig.server)}
                >
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Stream Key */}
            <div className="space-y-2">
              <Label htmlFor="streamKey">Stream Key</Label>
              <div className="flex gap-2">
                <Input
                  id="streamKey"
                  value={obsConfig.stream_key}
                  readOnly
                  type="password"
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(obsConfig.stream_key)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Keep this key secure and never share it publicly
              </p>
            </div>

            {/* Additional Settings */}
            {(obsConfig.bitrate || obsConfig.fps) && (
              <div className="grid grid-cols-2 gap-4">
                {obsConfig.bitrate && (
                  <div className="space-y-2">
                    <Label>Bitrate</Label>
                    <Input
                      value={`${obsConfig.bitrate} kbps`}
                      readOnly
                      className="font-mono text-sm"
                    />
                  </div>
                )}
                {obsConfig.fps && (
                  <div className="space-y-2">
                    <Label>FPS</Label>
                    <Input
                      value={`${obsConfig.fps} fps`}
                      readOnly
                      className="font-mono text-sm"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* OBS Path */}
          <div className="space-y-4">
            <h3 className="font-semibold">OBS Application</h3>
            <div className="space-y-2">
              <Label htmlFor="obsPath">OBS Executable Path</Label>
              <Input
                id="obsPath"
                value={obsPath}
                onChange={(e) => setObsPath(e.target.value)}
                placeholder="Path to OBS executable"
                className="font-mono text-sm"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleOpenOBS}
              disabled={!obsPath || isOpening || streamSession.status === 'live'}
              className="flex-1"
            >
              {isOpening ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Opening OBS...
                </>
              ) : streamSession.status === 'live' ? (
                <>
                  <Video className="w-4 h-4 mr-2" />
                  Stream is Live
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open OBS
                </>
              )}
            </Button>

            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Next Steps:</h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Copy the RTMP Server and Stream Key above</li>
              <li>Open OBS using the button above or launch it manually</li>
              <li>Go to Settings → Stream and enter the credentials</li>
              <li>Click "Start Streaming" in OBS</li>
              <li>Your stream will go live automatically when detected</li>
              <li>Dashboard will update in real-time</li>
            </ol>
          </div>

          {/* Warning if Restream not configured */}
          {obsConfig.stream_key === 'NOT_CONFIGURED' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-900">Restream Not Configured</h4>
                  <p className="text-sm text-yellow-800 mt-1">
                    Please configure your Restream account in settings to enable streaming.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Live indicator */}
          {streamSession.status === 'live' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="font-semibold text-red-900">Your stream is LIVE!</span>
              </div>
              <p className="text-sm text-red-800 mt-1">
                Viewers can now watch your stream on all configured platforms.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
