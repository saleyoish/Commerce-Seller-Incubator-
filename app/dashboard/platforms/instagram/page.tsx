'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClientSideSupabase, type PlatformConnection, type Seller } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, ChevronRight, ChevronLeft, DollarSign, Video, Info, Smartphone } from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Instagram Account', description: 'Business or Creator account' },
  { id: 2, title: 'Enable Live', description: 'Check live access' },
  { id: 3, title: 'Shopping', description: 'Connect products' },
  { id: 4, title: 'Commission', description: 'Understand earnings' },
  { id: 5, title: 'Go Live', description: 'Start streaming' },
];

export default function InstagramSetupPage() {
  const router = useRouter();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [connection, setConnection] = useState<PlatformConnection | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    username: '',
    followerCount: '',
    step2Complete: false,
    step3Complete: false,
    step4Complete: false,
    step5Complete: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const supabase = createClientSideSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data: sellerData } = await supabase.from('sellers').select('*').eq('user_id', user.id).single();
      if (!sellerData) { router.push('/signup'); return; }
      setSeller(sellerData);
      const { data: connectionData } = await supabase.from('platform_connections').select('*').eq('seller_id', sellerData.id).eq('platform', 'instagram').maybeSingle();
      if (connectionData) {
        setConnection(connectionData);
        const metadata = connectionData.metadata || {};
        setFormData(prev => ({
          ...prev,
          username: metadata.username || connectionData.platform_user_id || '',
          followerCount: metadata.followerCount || '',
          step2Complete: metadata.step2Complete || false,
          step3Complete: metadata.step3Complete || false,
          step4Complete: metadata.step4Complete || false,
          step5Complete: metadata.step5Complete || false,
        }));
        if (metadata.completedSteps) {
          setCurrentStep(metadata.completedSteps);
        }
      }
    } catch (error) {
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const saveStep = async () => {
    if (!seller) return;
    setIsSaving(true);
    try {
      const supabase = createClientSideSupabase();
      const saveData = {
        seller_id: seller.id,
        platform: 'instagram',
        platform_user_id: formData.username || null,
        is_active: currentStep === 5,
        metadata: {
          username: formData.username,
          followerCount: formData.followerCount,
          step2Complete: formData.step2Complete,
          step3Complete: formData.step3Complete,
          step4Complete: formData.step4Complete,
          step5Complete: formData.step5Complete,
          completedSteps: currentStep,
          status: currentStep === 5 ? 'connected' : 'pending',
        },
      };
      let result;
      if (connection) {
        result = await supabase.from('platform_connections').update(saveData).eq('id', connection.id);
      } else {
        result = await supabase.from('platform_connections').insert(saveData).select().single();
        if (result.data) setConnection(result.data);
      }
      if (result.error) throw result.error;
      if (currentStep < 5) setCurrentStep(currentStep + 1);
    } catch (error: any) {
      setError(error.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 rounded-lg">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Set Up Instagram Live</h1>
            <p className="text-gray-600">Stream and sell on Instagram</p>
          </div>
        </div>
        <Link href="/dashboard/platforms" className="text-blue-600 hover:underline text-sm">Back to Platforms</Link>
      </div>

      {error && <Alert variant="destructive" className="mb-6"><AlertDescription>{error}</AlertDescription></Alert>}

      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <button onClick={() => step.id <= currentStep && setCurrentStep(step.id)} disabled={step.id > currentStep} className={`flex flex-col items-center p-2 rounded-lg transition-colors ${step.id <= currentStep ? 'cursor-pointer hover:bg-gray-100' : 'cursor-not-allowed opacity-50'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${step.id < currentStep ? 'bg-green-500 text-white' : step.id === currentStep ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {step.id < currentStep ? <CheckCircle className="w-5 h-5" /> : <span className="font-semibold">{step.id}</span>}
                </div>
                <span className="text-xs font-medium text-center hidden sm:block">{step.title}</span>
              </button>
              {index < STEPS.length - 1 && <div className={`flex-1 h-1 mx-2 ${step.id < currentStep ? 'bg-green-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
          <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
                <h3 className="font-semibold mb-2 flex items-center"><Info className="w-4 h-4 mr-2" />Instagram Requirements</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>Business or Creator account (not personal)</li>
                  <li>At least 1,000 followers recommended</li>
                  <li>Account in good standing</li>
                </ul>
              </div>
              <div className="space-y-4">
                <div><Label htmlFor="username">Instagram Username</Label><Input id="username" placeholder="yourusername" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value.replace('@', '') })} /></div>
                <div><Label htmlFor="followerCount">Follower Count</Label><Input id="followerCount" placeholder="e.g., 5000" value={formData.followerCount} onChange={(e) => setFormData({ ...formData, followerCount: e.target.value })} /></div>
              </div>
              <div className="flex items-center gap-3 pt-4">
                <input type="checkbox" id="step1" checked={!!formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.checked ? formData.username || '' : '' })} className="w-5 h-5 rounded border-gray-300" />
                <Label htmlFor="step1" className="text-sm cursor-pointer">I have an Instagram Business/Creator account</Label>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <p className="text-sm text-gray-600">Instagram Live is available to most accounts:</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5" /><span>Swipe right from feed or tap + → Live</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5" /><span>No minimum follower requirement</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5" /><span>Up to 4 hours per live session</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5" /><span>Can invite guests to join</span></li>
              </ul>
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800"><strong>Note:</strong> Instagram does not support RTMP streaming directly. Use phone or Instagram Live Producer.</p>
              </div>
              <div className="flex items-center gap-3 pt-4">
                <input type="checkbox" id="step2" checked={formData.step2Complete} onChange={(e) => setFormData({ ...formData, step2Complete: e.target.checked })} className="w-5 h-5 rounded border-gray-300" />
                <Label htmlFor="step2" className="text-sm cursor-pointer">I can go live on Instagram</Label>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <p className="text-sm text-gray-600">Connect shopping features:</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5" /><span>Tag products in posts (requires approval)</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5" /><span>Mention prices in live video</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5" /><span>Pin product link in bio during live</span></li>
              </ul>
              <div className="flex items-center gap-3 pt-4">
                <input type="checkbox" id="step3" checked={formData.step3Complete} onChange={(e) => setFormData({ ...formData, step3Complete: e.target.checked })} className="w-5 h-5 rounded border-gray-300" />
                <Label htmlFor="step3" className="text-sm cursor-pointer">I understand how to sell on Instagram Live</Label>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center"><DollarSign className="w-4 h-4 mr-2" />Commission Breakdown</h3>
                <p className="text-sm text-gray-600">Instagram sales through external links:</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border rounded-lg p-4"><p className="text-sm text-gray-500">Processing Fee</p><p className="text-2xl font-bold text-gray-700">~5%</p></div>
                <div className="bg-white border rounded-lg p-4"><p className="text-sm text-gray-500">Our Commission</p><p className="text-2xl font-bold text-blue-600">15%</p></div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4"><p className="text-sm text-green-600">You Keep</p><p className="text-2xl font-bold text-green-700">~81%</p></div>
              </div>
              <div className="flex items-center gap-3 pt-4">
                <input type="checkbox" id="step4" checked={formData.step4Complete} onChange={(e) => setFormData({ ...formData, step4Complete: e.target.checked })} className="w-5 h-5 rounded border-gray-300" />
                <Label htmlFor="step4" className="text-sm cursor-pointer">I understand the commission structure</Label>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
                <h3 className="font-semibold mb-2 flex items-center"><Video className="w-4 h-4 mr-2" />Going Live on Instagram</h3>
                <p className="text-sm text-gray-600">You are ready! Start your Instagram Live:</p>
              </div>
              <ol className="space-y-3 text-sm">
                <li className="flex items-start gap-3"><span className="bg-purple-100 text-purple-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0">1</span><span>Open Instagram app</span></li>
                <li className="flex items-start gap-3"><span className="bg-purple-100 text-purple-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0">2</span><span>Swipe right from feed or tap + → Live</span></li>
                <li className="flex items-start gap-3"><span className="bg-purple-100 text-purple-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0">3</span><span>Add title and go live</span></li>
                <li className="flex items-start gap-3"><span className="bg-purple-100 text-purple-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0">4</span><span>Engage with viewers, mention products</span></li>
              </ol>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Tips:</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>Best times: Evenings (7-10 PM)</li>
                  <li>Respond to comments in real-time</li>
                  <li>Share live to Stories for more reach</li>
                </ul>
              </div>
              <div className="flex items-center gap-3 pt-4">
                <input type="checkbox" id="step5" checked={formData.step5Complete} onChange={(e) => setFormData({ ...formData, step5Complete: e.target.checked })} className="w-5 h-5 rounded border-gray-300" />
                <Label htmlFor="step5" className="text-sm cursor-pointer">I am ready to go live on Instagram!</Label>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-6 mt-6 border-t">
            <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)} disabled={currentStep === 1}><ChevronLeft className="w-4 h-4 mr-2" />Previous</Button>
            {currentStep < 5 ? (
              <Button onClick={saveStep} disabled={isSaving}>{isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><>Next<ChevronRight className="w-4 h-4 ml-2" /></></>}</Button>
            ) : (
              <Button onClick={saveStep} disabled={isSaving || !formData.step5Complete} className="bg-green-600 hover:bg-green-700">{isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Completing...</> : <><CheckCircle className="w-4 h-4 mr-2" />Complete Setup</>}</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
