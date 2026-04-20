'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  ExternalLink,
  Video,
  Settings,
  MonitorPlay,
  Radio,
  Download,
  Copy,
  Check,
  ArrowLeft
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
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [formData, setFormData] = useState({
    restreamUsername: '',
    streamKey: '',
  });
  const [copied, setCopied] = useState(false);

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
        <Link href="/dashboard/platforms" className="text-blue-600 hover:underline text-sm">
          ← Back to Platforms
        </Link>
      </div>

      {/* What is Restream */}
      <Card className="mb-8 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            What is Restream.io?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Restream.io lets you broadcast your live stream to multiple platforms simultaneously. 
            No need to choose between TikTok, Whatnot, YouTube, Facebook, or Instagram - 
            stream to all of them at once!
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-white">Free Tier: 2 platforms</Badge>
            <Badge variant="outline" className="bg-white">Paid: Unlimited platforms</Badge>
            <Badge variant="outline" className="bg-white">No custom server needed</Badge>
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
                  <a href={step.url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Sign Up at Restream.io
                    </Button>
                  </a>
                </div>
              )}

              {step.id === 2 && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    In your Restream dashboard, add these destinations:
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {step.platforms?.map((platform) => (
                      <div key={platform.name} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <span>{platform.icon}</span>
                        <span className="text-sm">{platform.name}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-lg text-sm">
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

                  <a href="https://restream.io/tools/obs-studio" target="_blank" rel="noopener noreferrer" className="w-full">
                    <Button variant="outline" className="w-full">
                      <Download className="w-4 h-4 mr-2" />
                      Download OBS Profile for Restream
                    </Button>
                  </a>
                </div>
              )}

              {step.id === 4 && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">Before your first multi-stream:</p>
                  <ul className="space-y-2">
                    {step.checklist?.map((item, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-gray-300" />
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
              <Link href="/dashboard/streaming">
                <Button>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Go to Streaming Dashboard
                </Button>
              </Link>
              <Link href="/dashboard/platforms">
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
