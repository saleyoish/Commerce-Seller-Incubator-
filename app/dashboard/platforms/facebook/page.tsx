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
import { Loader2, CheckCircle, ChevronRight, ChevronLeft, DollarSign, Video, Info } from 'lucide-react';

// Facebook icon component
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

const STEPS = [
  { id: 1, title: 'Facebook Page', description: 'Set up business page' },
  { id: 2, title: 'Enable Live', description: 'Activate live streaming' },
  { id: 3, title: 'Shopping', description: 'Connect products' },
  { id: 4, title: 'Commission', description: 'Understand earnings' },
  { id: 5, title: 'Go Live', description: 'Start streaming' },
];

export default function FacebookSetupPage() {
  const router = useRouter();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [connection, setConnection] = useState<PlatformConnection | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    pageUrl: '',
    pageName: '',
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
      const { data: connectionData } = await supabase.from('platform_connections').select('*').eq('seller_id', sellerData.id).eq('platform', 'facebook').maybeSingle();
      if (connectionData) {
        setConnection(connectionData);
        setFormData(prev => ({ ...prev, pageUrl: connectionData.metadata?.pageUrl || '', pageName: connectionData.metadata?.pageName || '' }));
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
        platform: 'facebook',
        platform_user_id: formData.pageName || null,
        is_active: currentStep === 5,
        metadata: {
          pageName: formData.pageName,
          followerCount: formData.followerCount,
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
        if (result.data) setConnection(result.data);
      }
      if (result.error) throw result.error;
      if (currentStep < 5) setCurrentStep(currentStep + 1);
    } catch (error: any) {
      console.error('Error saving:', error);
      const errorMsg = error?.message || error?.error_description || JSON.stringify(error) || 'Failed to save';
      setError(errorMsg.includes('relation') && errorMsg.includes('does not exist')
        ? 'Database table not set up yet. Please run the SQL schema migration.'
        : errorMsg);
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
          <div className="p-3 bg-blue-600 rounded-lg"><FacebookIcon className="w-8 h-8 text-white" /></div>
          <div>
            <h1 className="text-3xl font-bold">Set Up Facebook Live</h1>
            <p className="text-gray-600">Stream and sell on Facebook</p>
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
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${step.id < currentStep ? 'bg-green-500 text-white' : step.id === currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
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
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center"><Info className="w-4 h-4 mr-2" />Facebook Page Requirements</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>Business or Creator page (not personal profile)</li>
                  <li>Page must be published</li>
                  <li>You must be an admin or editor</li>
                </ul>
              </div>
              <div className="space-y-4">
                <div><Label htmlFor="pageUrl">Facebook Page URL</Label><Input id="pageUrl" placeholder="https://facebook.com/yourpage" value={formData.pageUrl} onChange={(e) => setFormData({ ...formData, pageUrl: e.target.value })} /></div>
                <div><Label htmlFor="pageName">Page Name</Label><Input id="pageName" placeholder="Your Business Name" value={formData.pageName} onChange={(e) => setFormData({ ...formData, pageName: e.target.value })} /></div>
              </div>
              <div className="flex items-center gap-3 pt-4">
                <input type="checkbox" id="step1" checked={!!formData.pageUrl} onChange={(e) => setFormData({ ...formData, pageUrl: e.target.checked ? formData.pageUrl || 'https://' : '' })} className="w-5 h-5 rounded border-gray-300" />
                <Label htmlFor="step1" className="text-sm cursor-pointer">I have a Facebook Business Page</Label>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <p className="text-sm text-gray-600">To enable live streaming on Facebook:</p>
              <ol className="space-y-3 text-sm">
                <li className="flex items-start gap-3"><span className="bg-gray-200 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0">1</span><span>Go to your Facebook Page</span></li>
                <li className="flex items-start gap-3"><span className="bg-gray-200 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0">2</span><span>Click Live or Create → Live Video</span></li>
                <li className="flex items-start gap-3"><span className="bg-gray-200 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0">3</span><span>Choose streaming software (OBS) or use phone</span></li>
                <li className="flex items-start gap-3"><span className="bg-gray-200 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0">4</span><span>Get stream key from Live Producer</span></li>
              </ol>
              <div className="flex items-center gap-3 pt-4">
                <input type="checkbox" id="step2" checked={formData.step2Complete} onChange={(e) => setFormData({ ...formData, step2Complete: e.target.checked })} className="w-5 h-5 rounded border-gray-300" />
                <Label htmlFor="step2" className="text-sm cursor-pointer">I can go live on my Facebook Page</Label>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <p className="text-sm text-gray-600">Connect shopping features:</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5" /><span>Link products in live video description</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5" /><span>Use Facebook Shops (if eligible)</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5" /><span>Pin product links in comments</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5" /><span>Enable Live Shopping (business accounts)</span></li>
              </ul>
              <div className="flex items-center gap-3 pt-4">
                <input type="checkbox" id="step3" checked={formData.step3Complete} onChange={(e) => setFormData({ ...formData, step3Complete: e.target.checked })} className="w-5 h-5 rounded border-gray-300" />
                <Label htmlFor="step3" className="text-sm cursor-pointer">I understand how to sell on Facebook Live</Label>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center"><DollarSign className="w-4 h-4 mr-2" />Commission Breakdown</h3>
                <p className="text-sm text-gray-600">Facebook Live sales structure:</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border rounded-lg p-4"><p className="text-sm text-gray-500">Facebook Fee</p><p className="text-2xl font-bold text-gray-700">~5%</p><p className="text-xs text-gray-400">Payment processing</p></div>
                <div className="bg-white border rounded-lg p-4"><p className="text-sm text-gray-500">Our Commission</p><p className="text-2xl font-bold text-blue-600">15%</p><p className="text-xs text-gray-400">Of amount after fees</p></div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4"><p className="text-sm text-green-600">You Keep</p><p className="text-2xl font-bold text-green-700">~81%</p><p className="text-xs text-green-600">Final payout</p></div>
              </div>
              <div className="flex items-center gap-3 pt-4">
                <input type="checkbox" id="step4" checked={formData.step4Complete} onChange={(e) => setFormData({ ...formData, step4Complete: e.target.checked })} className="w-5 h-5 rounded border-gray-300" />
                <Label htmlFor="step4" className="text-sm cursor-pointer">I understand the commission structure</Label>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center"><Video className="w-4 h-4 mr-2" />Going Live on Facebook</h3>
                <p className="text-sm text-gray-600">You are ready! Start your first Facebook Live:</p>
              </div>
              <ol className="space-y-3 text-sm">
                <li className="flex items-start gap-3"><span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0">1</span><span>Go to your Facebook Page</span></li>
                <li className="flex items-start gap-3"><span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0">2</span><span>Click Live button below cover photo</span></li>
                <li className="flex items-start gap-3"><span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0">3</span><span>Choose Streaming Software and copy stream key</span></li>
                <li className="flex items-start gap-3"><span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0">4</span><span>Paste key in OBS or stream via Restream</span></li>
              </ol>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Multi-Stream with Restream:</h4>
                <Link href="/dashboard/streaming/setup"><Button variant="outline" size="sm">Set Up Restream</Button></Link>
              </div>
              <div className="flex items-center gap-3 pt-4">
                <input type="checkbox" id="step5" checked={formData.step5Complete} onChange={(e) => setFormData({ ...formData, step5Complete: e.target.checked })} className="w-5 h-5 rounded border-gray-300" />
                <Label htmlFor="step5" className="text-sm cursor-pointer">I am ready to go live on Facebook!</Label>
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
