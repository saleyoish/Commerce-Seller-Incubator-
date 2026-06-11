'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle,
  ExternalLink,
  Video,
  Settings,
  MonitorPlay,
  Radio,
  Copy,
  Check,
  ArrowLeft,
  Save,
  Loader2
} from 'lucide-react';

const SETUP_STEPS = [
  {
    id: 1,
    title: 'Create Restream Account',
    description: 'Sign up for Restream.io (Free tier: 2 platforms)',
    action: 'Sign Up',
    url: 'https://restream.io',
    fields: [
      { id: 'restreamUsername', label: 'Restream Username', placeholder: '@username' }
    ]
  },
  {
    id: 2,
    title: 'Connect Platforms',
    description: 'Add your streaming destinations',
    platforms: [
      { name: 'TikTok Live', icon: '🔴', color: 'bg-black' },
      { name: 'Whatnot', icon: '📦', color: 'bg-orange-500' },
      { name: 'YouTube Live', icon: '▶️', color: 'bg-red-600' },
      { name: 'Facebook Live', icon: '👥', color: 'bg-blue-600' },
      { name: 'Instagram Live', icon: '📸', color: 'bg-pink-500' },
    ]
  },
  {
    id: 3,
    title: 'Configure OBS',
    description: 'Set up OBS Studio to stream to Restream',
    rtmpUrl: 'rtmp://live.restream.io/live',
    streamKeyPlaceholder: 'your-restream-stream-key',
  },
  {
    id: 4,
    title: 'Test Multi-Stream',
    description: 'Verify all platforms are receiving your stream',
    checklist: [
      'Start OBS',
      'Connect to Restream',
      'Verify all platforms receiving stream',
      'Check audio/video quality',
      'Test Restream chat monitoring'
    ]
  }
];

export default function StreamingSetupPage() {
  const router = useRouter();
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [formData, setFormData] = useState({
    restreamUsername: '',
    streamKey: '',
  });
  const [savedData, setSavedData] = useState({
    restreamUsername: '',
    streamKey: '',
  });
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load saved credentials on mount
  useEffect(() => {
    loadSavedCredentials();
  }, []);

  const loadSavedCredentials = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const authRes = await fetch('/api/auth/check-user', { credentials: 'omit' });
      if (!authRes.ok) {
        console.log('No user found, redirecting to login');
        router.push('/login');
        return;
      }
      const userData = await authRes.json();
      if (!userData.user) {
        console.log('No user found, redirecting to login');
        router.push('/login');
        return;
      }

      const { db: dbClient } = await import('@/lib/db');

      // Get seller data - prioritize seller with valid stream key
      let seller = null;
      try {
        const { data: sellerDataList, error } = await dbClient
          .from('sellers')
          .select('restream_username, restream_stream_key')
          .eq('user_id', userData.user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Query error (columns may not exist):', error);
          // Don't show error, just continue with empty data
        } else if (sellerDataList && sellerDataList.length > 0) {
          // First, look for a seller with a valid stream key
          seller = sellerDataList.find((s: any) => s.restream_stream_key && 
                                          s.restream_stream_key !== 'NOT_CONFIGURED' && 
                                          s.restream_stream_key.length > 10);
          
          // If no seller has a valid stream key, use the most recent seller
          if (!seller) {
            seller = sellerDataList[0];
          }
        }
      } catch (queryErr) {
        console.warn('Query failed, columns probably missing:', queryErr);
        // Continue with empty seller
      }

      if (seller) {
        const newData = {
          restreamUsername: seller.restream_username || '',
          streamKey: seller.restream_stream_key || '',
        };
        setFormData(newData);
        setSavedData(newData);

        // Auto-mark steps as completed if data exists
        const completed: number[] = [];
        if (newData.restreamUsername && newData.restreamUsername.trim().length > 0) completed.push(1);
        if (newData.streamKey && newData.streamKey.trim().length > 10) {
          completed.push(2); // Auto-mark Connect Platforms as complete
          completed.push(3);
          completed.push(4); // Auto-mark Test Multi-Stream as complete
        }
        setCompletedSteps(completed);
      }
      // If no seller data, just show empty form (no error)
    } catch (err: any) {
      console.error('Unexpected error loading credentials:', err);
      // Don't show error to user, just log it
    } finally {
      setIsLoading(false);
    }
  };

  const saveCredentials = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      const authRes = await fetch('/api/auth/check-user', { credentials: 'omit' });
      if (!authRes.ok) {
        setError('Please login first');
        return;
      }
      const userData = await authRes.json();
      if (!userData.user) {
        setError('Please login first');
        return;
      }

      const { db: dbClient } = await import('@/lib/db');

      // Check if seller record exists first by user_id, then by email
      let existingSellers = null;
      let existingSeller = null;

      const { data: sellersById } = await dbClient
        .from('sellers')
        .select('id, restream_stream_key')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });

      existingSellers = sellersById;

      if ((!existingSellers || existingSellers.length === 0) && userData.user.email) {
        const { data: sellersByEmail } = await dbClient
          .from('sellers')
          .select('id, restream_stream_key')
          .eq('email', userData.user.email)
          .order('created_at', { ascending: false });
        existingSellers = sellersByEmail;
      }

      if (existingSellers && existingSellers.length > 0) {
        existingSeller = existingSellers.find((s: any) => s.restream_stream_key && 
                                                 s.restream_stream_key !== 'NOT_CONFIGURED' && 
                                                 s.restream_stream_key.length > 10);
        if (!existingSeller) {
          existingSeller = existingSellers[0];
        }
      }

      if (!existingSeller) {
        setError('Seller profile not found. Please complete onboarding first.');
        return;
      }

      // Update seller record with Restream credentials
      const { error: updateError } = await dbClient
        .from('sellers')
        .update({
          restream_username: formData.restreamUsername,
          restream_stream_key: formData.streamKey,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userData.user.id);

      if (updateError) {
        console.error('Update error:', updateError);
        if (updateError.message?.includes('column') || updateError.message?.includes('does not exist')) {
          setError('Database columns missing. Please run in Supabase SQL Editor: ALTER TABLE sellers ADD COLUMN restream_username TEXT; ALTER TABLE sellers ADD COLUMN restream_stream_key TEXT;');
        } else {
          throw updateError;
        }
        return;
      }

      setSavedData({ ...formData });
      setSuccess('Restream credentials saved successfully!');

      // Mark steps as completed
      const completed = [...completedSteps];
      if (formData.restreamUsername && formData.restreamUsername.trim().length > 0 && !completed.includes(1)) completed.push(1);
      if (formData.streamKey && formData.streamKey.trim().length > 10) {
        if (!completed.includes(2)) completed.push(2); // Auto-mark Connect Platforms as complete
        if (!completed.includes(3)) completed.push(3);
      }
      setCompletedSteps(completed);

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving credentials:', err);
      const errorMessage = err?.message || err?.error_description || 'Unknown error';
      setError(`Failed to save: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStep = (stepId: number) => {
    setCompletedSteps(prev =>
      prev.includes(stepId)
        ? prev.filter(id => id !== stepId)
        : [...prev, stepId]
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-600 rounded-lg">
            <Radio className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Multi-Stream Setup</h1>
            <p className="text-gray-600">Stream to multiple platforms with Restream.io</p>
          </div>
        </div>
        <Link href="/seller/streaming" className="text-blue-600 hover:underline text-sm">
          ← Back to Streaming Dashboard
        </Link>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}

      {/* What is Restream */}
      <Card className="mb-8 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Video className="w-5 h-5" />
            What is Restream.io?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700 mb-4">
            Restream.io lets you broadcast your live stream to multiple platforms simultaneously.
            No need to choose between TikTok, Whatnot, YouTube, Facebook, or Instagram -
            stream to all of them at once!
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-white text-gray-800">Free Tier: 2 platforms</Badge>
            <Badge variant="outline" className="bg-white text-gray-800">Paid: Unlimited platforms</Badge>
            <Badge variant="outline" className="bg-white text-gray-800">No custom server needed</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Setup Steps */}
      <div className="space-y-6">
        {SETUP_STEPS.map((step) => (
          <Card key={step.id} className={completedSteps.includes(step.id) ? 'border-green-300 bg-green-50/30' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    completedSteps.includes(step.id) 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {completedSteps.includes(step.id) ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <span className="font-semibold">{step.id}</span>
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{step.title}</CardTitle>
                    <CardDescription>{step.description}</CardDescription>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={completedSteps.includes(step.id)}
                  onChange={() => toggleStep(step.id)}
                  className="w-5 h-5 rounded border-gray-300"
                />
              </div>
            </CardHeader>
            <CardContent>
              {step.id === 1 && (
                <div className="space-y-4">
                  <div>
                    <Label>Restream Username</Label>
                    <Input
                      placeholder="@yourusername"
                      value={formData.restreamUsername}
                      onChange={(e) => setFormData({ ...formData, restreamUsername: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={saveCredentials}
                      disabled={isSaving || !formData.restreamUsername}
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Username
                    </Button>
                    <a href={step.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Sign Up at Restream.io
                      </Button>
                    </a>
                  </div>
                </div>
              )}

              {step.id === 2 && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-700">
                    In your Restream dashboard, add these destinations:
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {step.platforms?.map((platform) => (
                      <div key={platform.name} className="flex items-center gap-2 p-2 bg-gray-100 rounded border">
                        <span>{platform.icon}</span>
                        <span className="text-sm text-gray-800 font-medium">{platform.name}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-yellow-100 border border-yellow-300 p-3 rounded-lg text-sm text-gray-800">
                    <strong>Note:</strong> TikTok and Instagram require specific setup.
                    Follow Restream&apos;s connection guides for each platform.
                  </div>
                </div>
              )}

              {step.id === 3 && (
                <div className="space-y-4">
                  <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
                    <p className="mb-2"># OBS Studio Settings → Stream</p>
                    <p>Service: Restream.io</p>
                    <p>Server: {step.rtmpUrl}</p>
                    <p>Stream Key: [Your Restream Key]</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>RTMP URL</Label>
                      <div className="flex">
                        <Input value={step.rtmpUrl} readOnly />
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="ml-2 shrink-0"
                          onClick={() => copyToClipboard(step.rtmpUrl || '')}
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label>Your Stream Key</Label>
                      <Input
                        placeholder="Paste your Restream stream key here"
                        value={formData.streamKey}
                        onChange={(e) => setFormData({ ...formData, streamKey: e.target.value })}
                      />
                    </div>
                  </div>

                  <Button
                    onClick={saveCredentials}
                    disabled={isSaving || !formData.streamKey}
                    className="w-full"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Stream Key
                  </Button>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h5 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      OBS Setup Instructions
                    </h5>
                    <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                      <li>Open OBS Studio</li>
                      <li>Go to <strong>Settings → Stream</strong></li>
                      <li>Service: Select <strong>&quot;Restream.io&quot;</strong> (or Custom if not listed)</li>
                      <li>Server: <code className="bg-white px-1 rounded">rtmp://live.restream.io/live</code></li>
                      <li>Stream Key: Paste your key from above ↑</li>
                      <li>Click <strong>OK</strong> then <strong>Start Streaming</strong></li>
                    </ol>
                  </div>

                  <a href="https://restream.io/tools/obs-studio" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />
                    Need help? Visit Restream OBS Guide
                  </a>
                </div>
              )}

              {step.id === 4 && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">Before your first multi-stream:</p>
                  <ul className="space-y-2">
                    {step.checklist?.map((item, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle className={`w-4 h-4 ${completedSteps.includes(4) ? 'text-green-600' : 'text-gray-300'}`} />
                        {item}
                      </li>
                    ))}
                  </ul>
                  
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center">
                      <MonitorPlay className="w-4 h-4 mr-2" />
                      Restream Chat Monitoring
                    </h4>
                    <p className="text-sm text-gray-600">
                      Use Restream&apos;s unified chat dashboard to see messages from 
                      all platforms in one place. This helps you engage with viewers 
                      across TikTok, YouTube, Facebook, etc. simultaneously.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Completion Summary */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Setup Progress</CardTitle>
          <CardDescription>
            {completedSteps.length === SETUP_STEPS.length 
              ? "You're ready to multi-stream!" 
              : `Complete ${SETUP_STEPS.length - completedSteps.length} more step${SETUP_STEPS.length - completedSteps.length !== 1 ? 's' : ''}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-600">
              {completedSteps.length} of {SETUP_STEPS.length} steps completed
            </span>
            <Badge className={completedSteps.length === SETUP_STEPS.length ? 'bg-green-500' : 'bg-blue-500'}>
              {Math.round((completedSteps.length / SETUP_STEPS.length) * 100)}%
            </Badge>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${(completedSteps.length / SETUP_STEPS.length) * 100}%` }}
            />
          </div>

          {completedSteps.length === SETUP_STEPS.length && (
            <div className="mt-6 flex gap-3">
              <Link href="/seller/streaming">
                <Button>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Go to Streaming Dashboard
                </Button>
              </Link>
              <Link href="/seller/platforms">
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Platforms
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
