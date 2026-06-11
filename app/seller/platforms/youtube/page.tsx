'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type PlatformConnection, type Seller, createClientSideSupabase } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  CheckCircle, 
  ChevronRight, 
  ChevronLeft,
  ExternalLink,
  DollarSign,
  Video,
  Info,
  Calculator
} from 'lucide-react';

// YouTube icon component
function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

const STEPS = [
  { id: 1, title: 'YouTube Channel', description: 'Set up your channel' },
  { id: 2, title: 'Enable Live', description: 'Activate live streaming' },
  { id: 3, title: 'Shopping', description: 'Connect shopping features' },
  { id: 4, title: 'Commission', description: 'Understand earnings' },
  { id: 5, title: 'Go Live', description: 'Start streaming' },
];

export default function YouTubeSetupPage() {
  const router = useRouter();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [connection, setConnection] = useState<PlatformConnection | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    channelUrl: '',
    subscriberCount: '',
    step2Complete: false,
    step3Complete: false,
    step4Complete: false,
    step5Complete: false,
  });

  const [saleAmount, setSaleAmount] = useState(100);
  const [calculation, setCalculation] = useState({
    platformFee: 30,
    ourCommission: 10.50,
    sellerPayout: 59.50,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const platformFee = saleAmount * 0.30;
    const subtotal = saleAmount - platformFee;
    const ourCommission = subtotal * 0.15;
    const sellerPayout = subtotal - ourCommission;
    
    setCalculation({
      platformFee: Number(platformFee.toFixed(2)),
      ourCommission: Number(ourCommission.toFixed(2)),
      sellerPayout: Number(sellerPayout.toFixed(2)),
    });
  }, [saleAmount]);

  const loadData = async () => {
    try {
      const res = await fetch('/api/auth/check-user', { credentials: 'omit' });
      if (!res.ok) { router.push('/login'); return; }
      const userData = await res.json();
      if (!userData.user) { router.push('/login'); return; }
      const { db: dbClient } = await import('@/lib/db');
      const { data: sellerData } = await dbClient.from('sellers').select('*').eq('user_id', userData.user.id).maybeSingle();
      if (!sellerData && !userData.isAdmin) { router.push('/signup'); return; }
      setSeller(sellerData);

      // Only fetch connections if seller exists
      if (sellerData) {
        const { data: connectionData } = await dbClient
          .from('platform_connections')
          .select('*')
          .eq('seller_id', sellerData.id)
          .eq('platform', 'youtube')
          .maybeSingle();

        if (connectionData) {
          setConnection(connectionData);
          setFormData(prev => ({
            ...prev,
            channelUrl: connectionData.metadata?.channelUrl || '',
            subscriberCount: connectionData.metadata?.subscriberCount || '',
          }));
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const saveStep = async () => {
    if (!seller) return;
    setIsSaving(true);
    setError(null);

    try {
      const supabase = createClientSideSupabase();
      const saveData = {
        seller_id: seller.id,
        platform: 'youtube',
        platform_user_id: formData.channelUrl?.replace('https://youtube.com/@', '') || null,
        status: currentStep === 5 ? 'connected' : 'pending',
        metadata: {
          channelUrl: formData.channelUrl,
          subscriberCount: formData.subscriberCount,
          step2Complete: formData.step2Complete,
          step3Complete: formData.step3Complete,
          step4Complete: formData.step4Complete,
          step5Complete: formData.step5Complete,
          completedSteps: currentStep,
          status: currentStep === 5 ? 'connected' : 'pending',
        },
        connected_at: currentStep === 5 ? new Date().toISOString() : connection?.connected_at,
      };

      let result;
      if (connection) {
        result = await supabase.from('platform_connections').update(saveData).eq('id', connection.id);
      } else {
        result = await supabase.from('platform_connections').insert(saveData).select().single();
      }

      if (!result) {
        throw new Error('No response from database');
      }

      if (result.error) {
        console.error('Supabase error details:', result.error);
        throw new Error(result.error.message || result.error.code || 'Database error occurred');
      }

      if (!connection && result.data) {
        setConnection(result.data);
      }

      if (currentStep < 5) setCurrentStep(currentStep + 1);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('Error saving step:', err);
      setError(err.message || 'Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connection || !confirm('Disconnect YouTube?')) return;

    try {
      setIsDisconnecting(true);
      setError(null);

      const supabase = createClientSideSupabase();
      const { error } = await supabase
        .from('platform_connections')
        .delete()
        .eq('id', connection.id);

      if (error) throw error;

      setConnection(null);
      setCurrentStep(1);
      setFormData({
        channelUrl: '',
        subscriberCount: '',
        step2Complete: false,
        step3Complete: false,
        step4Complete: false,
        step5Complete: false,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('Disconnect error:', err);
      setError(err.message || 'Failed to disconnect');
    } finally {
      setIsDisconnecting(false);
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
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-red-600 rounded-lg">
            <YoutubeIcon className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Set Up YouTube Live</h1>
            <p className="text-gray-600">Stream and sell on YouTube</p>
          </div>
        </div>
        <Link href="/seller/platforms" className="text-blue-600 hover:underline text-sm">
          ← Back to Platforms
        </Link>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <button
                onClick={() => step.id <= currentStep && setCurrentStep(step.id)}
                disabled={step.id > currentStep}
                className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                  step.id <= currentStep ? 'cursor-pointer hover:bg-gray-100' : 'cursor-not-allowed opacity-50'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                  step.id < currentStep ? 'bg-green-500 text-white' : 
                  step.id === currentStep ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {step.id < currentStep ? <CheckCircle className="w-5 h-5" /> : <span className="font-semibold">{step.id}</span>}
                </div>
                <span className="text-xs font-medium text-center hidden sm:block">{step.title}</span>
              </button>
              {index < STEPS.length - 1 && (
                <div className={`flex-1 h-1 mx-2 ${step.id < currentStep ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
          <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center text-gray-800">
                  <Info className="w-4 h-4 mr-2" />
                  YouTube Channel Requirements
                </h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Channel must be at least 7 days old</li>
                  <li>• No live streaming restrictions</li>
                  <li>• Phone verified account</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Channel Information:</h4>
                <div>
                  <Label htmlFor="channelUrl">YouTube Channel URL</Label>
                  <Input
                    id="channelUrl"
                    placeholder="https://youtube.com/@yourchannel"
                    value={formData.channelUrl}
                    onChange={(e) => setFormData({ ...formData, channelUrl: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="subscriberCount">Subscriber Count (Approximate)</Label>
                  <Input
                    id="subscriberCount"
                    placeholder="e.g., 1000"
                    value={formData.subscriberCount}
                    onChange={(e) => setFormData({ ...formData, subscriberCount: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <input
                  type="checkbox"
                  id="step1"
                  checked={!!formData.channelUrl}
                  onChange={(e) => setFormData({ ...formData, channelUrl: e.target.checked ? formData.channelUrl || 'https://' : '' })}
                  className="w-5 h-5 rounded border-gray-300"
                />
                <Label htmlFor="step1" className="text-sm cursor-pointer">
                  I have a YouTube channel ready for live streaming
                </Label>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <p className="text-sm text-gray-600">To enable live streaming on YouTube:</p>
              <ol className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <span className="bg-gray-200 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 text-gray-800">1</span>
                  <span>Go to <a href="https://studio.youtube.com" target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline">YouTube Studio</a></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-gray-200 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 text-gray-800">2</span>
                  <span>Click &quot;Create&quot; → &quot;Go Live&quot;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-gray-200 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 text-gray-800">3</span>
                  <span>Complete phone verification if prompted</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-gray-200 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 text-gray-800">4</span>
                  <span>Wait 24 hours for activation (first time only)</span>
                </li>
              </ol>

              <div className="flex items-center gap-3 pt-4">
                <input
                  type="checkbox"
                  id="step2"
                  checked={formData.step2Complete}
                  onChange={(e) => setFormData({ ...formData, step2Complete: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300"
                />
                <Label htmlFor="step2" className="text-sm cursor-pointer">
                  I have enabled live streaming on my channel
                </Label>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <p className="text-sm text-gray-600">Connect shopping features:</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Link your website/store in video descriptions</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Use YouTube Shopping (if eligible - 1,000+ subscribers)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Pin product links in live chat</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Mention products verbally with prices</span>
                </li>
              </ul>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Note:</strong> YouTube takes 30% of Super Chat, but product sales 
                  through your own links go directly to you (minus our 15% commission).
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <input
                  type="checkbox"
                  id="step3"
                  checked={formData.step3Complete}
                  onChange={(e) => setFormData({ ...formData, step3Complete: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300"
                />
                <Label htmlFor="step3" className="text-sm cursor-pointer">
                  I understand how to sell products on YouTube Live
                </Label>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center text-gray-800">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Commission Breakdown
                </h3>
                <p className="text-sm text-gray-600">YouTube Live sales structure:</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border rounded-lg p-4">
                  <p className="text-sm text-gray-500">YouTube Super Chat</p>
                  <p className="text-2xl font-bold text-gray-700">30%</p>
                  <p className="text-xs text-gray-400">Platform fee</p>
                </div>
                <div className="bg-white border rounded-lg p-4">
                  <p className="text-sm text-gray-500">Our Commission</p>
                  <p className="text-2xl font-bold text-blue-600">15%</p>
                  <p className="text-xs text-gray-400">Of amount after fees</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-600">You Keep</p>
                  <p className="text-2xl font-bold text-green-700">~59%</p>
                  <p className="text-xs text-green-600">Final payout (Super Chat)</p>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Better deal:</strong> When buyers purchase through your direct links 
                  (not Super Chat), you keep 85% (our 15% commission only).
                </p>
              </div>

              {/* Calculator */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-4 flex items-center text-gray-800">
                  <Calculator className="w-4 h-4 mr-2" />
                  Commission Calculator (Super Chat)
                </h4>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="saleAmount">Sale Amount ($)</Label>
                    <Input
                      id="saleAmount"
                      type="number"
                      value={saleAmount}
                      onChange={(e) => setSaleAmount(Number(e.target.value))}
                      min={1}
                    />
                  </div>
                  <div className="bg-white p-4 rounded-lg space-y-2 text-sm">
                    <div className="flex justify-between"><span>Sale Amount:</span><span className="font-medium">${saleAmount.toFixed(2)}</span></div>
                    <div className="flex justify-between text-red-600"><span>YouTube Fee (30%):</span><span>-${calculation.platformFee.toFixed(2)}</span></div>
                    <div className="flex justify-between text-orange-600"><span>Platform Commission (15%):</span><span>-${calculation.ourCommission.toFixed(2)}</span></div>
                    <div className="border-t pt-2 flex justify-between text-green-700 font-semibold"><span>Your Payout:</span><span>${calculation.sellerPayout.toFixed(2)}</span></div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <input
                  type="checkbox"
                  id="step4"
                  checked={formData.step4Complete}
                  onChange={(e) => setFormData({ ...formData, step4Complete: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300"
                />
                <Label htmlFor="step4" className="text-sm cursor-pointer">
                  I understand the commission structure
                </Label>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center">
                  <Video className="w-4 h-4 mr-2" />
                  Going Live on YouTube
                </h3>
                <p className="text-sm text-gray-600">
                  You&apos;re ready! Here&apos;s how to start your first YouTube Live:
                </p>
              </div>

              <ol className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <span className="bg-red-100 text-red-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0">1</span>
                  <span>Go to <a href="https://studio.youtube.com" target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline">YouTube Studio</a></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-red-100 text-red-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0">2</span>
                  <span>Click &quot;Create&quot; → &quot;Go Live&quot;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-red-100 text-red-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0">3</span>
                  <span>Choose &quot;Stream&quot; for pre-scheduled or &quot;Go Live Now&quot;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-red-100 text-red-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0">4</span>
                  <span>Set up title, description, and privacy settings</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-red-100 text-red-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0">5</span>
                  <span>Copy stream key to OBS if using Restream</span>
                </li>
              </ol>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Multi-Stream with Restream:</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Stream to YouTube AND other platforms simultaneously:
                </p>
                <ol className="text-sm space-y-1 text-gray-600">
                  <li>1. Add YouTube as destination in Restream</li>
                  <li>2. Authorize Restream with your YouTube account</li>
                  <li>3. Stream from OBS to Restream</li>
                </ol>
                <Link href="/seller/streaming/setup">
                  <Button variant="outline" size="sm" className="mt-3">
                    Set Up Restream →
                  </Button>
                </Link>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <input
                  type="checkbox"
                  id="step5"
                  checked={formData.step5Complete}
                  onChange={(e) => setFormData({ ...formData, step5Complete: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300"
                />
                <Label htmlFor="step5" className="text-sm cursor-pointer">
                  I&apos;m ready to go live on YouTube!
                </Label>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-6 mt-6 border-t">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(currentStep - 1)}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            
            {currentStep < 5 ? (
              <Button onClick={saveStep} disabled={isSaving}>
                {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><>Next<ChevronRight className="w-4 h-4 ml-2" /></></>}
              </Button>
            ) : (
              <Button onClick={saveStep} disabled={isSaving || !formData.step5Complete} className="bg-green-600 hover:bg-green-700">
                {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Completing...</> : <><CheckCircle className="w-4 h-4 mr-2" />Complete Setup</>}
              </Button>
            )}

            {connection?.status === 'connected' && (
              <Button variant="destructive" onClick={handleDisconnect} disabled={isDisconnecting || isSaving}>
                {isDisconnecting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Disconnecting...</>
                ) : (
                  'Disconnect'
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
