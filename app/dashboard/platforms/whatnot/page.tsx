'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClientSideSupabase, type PlatformConnection, type Seller } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  CheckCircle, 
  ChevronRight, 
  ChevronLeft,
  ExternalLink,
  Camera,
  DollarSign,
  Video,
  Info,
  Calculator
} from 'lucide-react';

// Whatnot icon component
function WhatnotIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6zm4 4h-2v-2h2v2zm0-4h-2V7h2v6z"/>
    </svg>
  );
}

const STEPS = [
  { id: 1, title: 'Create Account', description: 'Sign up on Whatnot' },
  { id: 2, title: 'Profile Setup', description: 'Configure your profile' },
  { id: 3, title: 'Product Guide', description: 'Learn Whatnot selling' },
  { id: 4, title: 'Commission', description: 'Understand earnings' },
  { id: 5, title: 'Go Live', description: 'Start streaming' },
];

const WHATNOT_CATEGORIES = [
  'Collectibles',
  'Fashion & Sneakers',
  'Electronics',
  'Sports Cards',
  'Comics',
  'Toys & Funko',
  'Art & Prints',
  'Jewelry & Watches',
  'Home & Garden',
  'Other'
];

export default function WhatnotSetupPage() {
  const router = useRouter();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [connection, setConnection] = useState<PlatformConnection | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    step1Complete: false,
    username: '',
    category: '',
    bio: '',
    step3Complete: false,
    step4Complete: false,
    step5Complete: false,
  });

  // Calculator state
  const [saleAmount, setSaleAmount] = useState(100);
  const [calculation, setCalculation] = useState({
    platformFee: 8,
    ourCommission: 13.80,
    sellerPayout: 78.20,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Recalculate commission
    const platformFee = saleAmount * 0.08;
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
      const supabase = createClientSideSupabase();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: sellerData } = await supabase
        .from('sellers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!sellerData) {
        router.push('/signup');
        return;
      }

      setSeller(sellerData);

      // Check for existing connection
      const { data: connectionData } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('seller_id', sellerData.id)
        .eq('platform', 'whatnot')
        .maybeSingle();

      if (connectionData) {
        setConnection(connectionData);
        const metadata = connectionData.metadata || {};
        setFormData(prev => ({
          ...prev,
          username: metadata.username || connectionData.platform_user_id || '',
          category: metadata.category || '',
          bio: metadata.bio || '',
          step1Complete: metadata.step1Complete || false,
          step3Complete: metadata.step3Complete || false,
          step4Complete: metadata.step4Complete || false,
          step5Complete: metadata.step5Complete || false,
        }));
        // Restore step position
        if (metadata.completedSteps) {
          setCurrentStep(metadata.completedSteps);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
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
        platform: 'whatnot',
        platform_user_id: formData.username || null,
        is_active: currentStep === 5,
        metadata: {
          username: formData.username,
          category: formData.category,
          bio: formData.bio,
          step1Complete: formData.step1Complete,
          step3Complete: formData.step3Complete,
          step4Complete: formData.step4Complete,
          step5Complete: formData.step5Complete,
          completedSteps: currentStep,
          status: currentStep === 5 ? 'connected' : 'pending',
        },
      };

      let result;
      if (connection) {
        result = await supabase
          .from('platform_connections')
          .update(saveData)
          .eq('id', connection.id);
      } else {
        result = await supabase
          .from('platform_connections')
          .insert(saveData)
          .select()
          .single();
        
        if (result.data) {
          setConnection(result.data);
        }
      }

      if (result.error) {
        console.error('Supabase error details:', result.error);
        throw new Error(result.error.message || JSON.stringify(result.error));
      }

      if (currentStep < 5) {
        setCurrentStep(currentStep + 1);
      }
    } catch (error: any) {
      console.error('Error saving:', error);
      setError(error?.message || error?.error_description || JSON.stringify(error) || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const goToStep = (step: number) => {
    if (step <= currentStep) {
      setCurrentStep(step);
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
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-[#FF6B35] rounded-lg">
            <WhatnotIcon className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Set Up Whatnot</h1>
            <p className="text-gray-600">Complete these steps to start selling on Whatnot</p>
          </div>
        </div>
        <Link href="/dashboard/platforms" className="text-blue-600 hover:underline text-sm">
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
                onClick={() => goToStep(step.id)}
                disabled={step.id > currentStep}
                className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                  step.id <= currentStep 
                    ? 'cursor-pointer hover:bg-gray-100' 
                    : 'cursor-not-allowed opacity-50'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                  step.id < currentStep 
                    ? 'bg-green-500 text-white'
                    : step.id === currentStep
                    ? 'bg-[#FF6B35] text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {step.id < currentStep ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <span className="font-semibold">{step.id}</span>
                  )}
                </div>
                <span className="text-xs font-medium text-center hidden sm:block">
                  {step.title}
                </span>
              </button>
              {index < STEPS.length - 1 && (
                <div className={`flex-1 h-1 mx-2 ${
                  step.id < currentStep ? 'bg-green-500' : 'bg-gray-200'
                }`} />
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
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center">
                  <Info className="w-4 h-4 mr-2" />
                  What is Whatnot?
                </h3>
                <p className="text-sm text-gray-600">
                  Whatnot is a live auction and shopping platform popular for collectibles, 
                  fashion, electronics, and more. Sellers host live shows where buyers can 
                  bid in real-time or buy instantly.
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Follow these steps to create your account:</h4>
                <ol className="space-y-3 text-sm">
                  <li className="flex items-start gap-3">
                    <span className="bg-gray-200 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0">1</span>
                    <span>Go to <a href="https://www.whatnot.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">whatnot.com</a></span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="bg-gray-200 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0">2</span>
                    <span>Click &quot;Sell on Whatnot&quot; or &quot;Become a Seller&quot;</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="bg-gray-200 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0">3</span>
                    <span>Sign up with your email or Google account</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="bg-gray-200 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0">4</span>
                    <span>Complete identity verification (ID, selfie)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="bg-gray-200 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0">5</span>
                    <span>Add bank account for payouts</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="bg-gray-200 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0">6</span>
                    <span>Wait for approval (usually 24-48 hours)</span>
                  </li>
                </ol>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <input
                  type="checkbox"
                  id="step1"
                  checked={formData.step1Complete}
                  onChange={(e) => setFormData({ ...formData, step1Complete: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300"
                />
                <Label htmlFor="step1" className="text-sm cursor-pointer">
                  I have created my Whatnot seller account
                </Label>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <p className="text-sm text-gray-600">
                Enter your Whatnot profile information. This helps us track your connection
                and provide better support.
              </p>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="username">Whatnot Username</Label>
                  <Input
                    id="username"
                    placeholder="@yourusername"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="category">Whatnot Category</Label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">Select a category</option>
                    {WHATNOT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="bio">Profile Bio (Optional)</Label>
                  <Textarea
                    id="bio"
                    placeholder="Brief description for your Whatnot profile..."
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">How Products Work on Whatnot</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Whatnot has a unique selling model compared to other platforms:
                </p>
                <ul className="text-sm space-y-2">
                  <li><strong>Auction:</strong> Set a starting bid, buyers compete in real-time</li>
                  <li><strong>Buy Now:</strong> Fixed price - buyers purchase instantly</li>
                  <li><strong>Giveaways:</strong> Free items to engage your audience</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Key Setup Steps:</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>Set up shipping preferences in Whatnot Seller Center</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>Configure tax settings (Whatnot handles sales tax)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>Connect your inventory/source products</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>Download the Whatnot app for mobile streaming</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gray-100 p-4 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center">
                  <Video className="w-4 h-4 mr-2" />
                  Video Tutorial
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  Watch this guide on setting up your first Whatnot show:
                </p>
                <a 
                  href="https://www.whatnot.com/seller/resources" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm flex items-center"
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Whatnot Seller Resources
                </a>
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
                  I understand how to list products on Whatnot
                </Label>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Commission Breakdown
                </h3>
                <p className="text-sm text-gray-600">
                  Here&apos;s how earnings are split on Whatnot sales:
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border rounded-lg p-4">
                    <p className="text-sm text-gray-500">Whatnot Fee</p>
                    <p className="text-2xl font-bold text-gray-700">~8%</p>
                    <p className="text-xs text-gray-400">Platform fee + processing</p>
                  </div>
                  <div className="bg-white border rounded-lg p-4">
                    <p className="text-sm text-gray-500">Our Commission</p>
                    <p className="text-2xl font-bold text-blue-600">15%</p>
                    <p className="text-xs text-gray-400">Of amount after platform fee</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-600">You Keep</p>
                    <p className="text-2xl font-bold text-green-700">~77%</p>
                    <p className="text-xs text-green-600">Final payout to you</p>
                  </div>
                </div>
              </div>

              {/* Calculator */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-4 flex items-center">
                  <Calculator className="w-4 h-4 mr-2" />
                  Commission Calculator
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
                    <div className="flex justify-between">
                      <span>Sale Amount:</span>
                      <span className="font-medium">${saleAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Whatnot Fee (8%):</span>
                      <span>-${calculation.platformFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-orange-600">
                      <span>Platform Commission (15%):</span>
                      <span>-${calculation.ourCommission.toFixed(2)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between text-green-700 font-semibold">
                      <span>Your Payout:</span>
                      <span>${calculation.sellerPayout.toFixed(2)}</span>
                    </div>
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
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center">
                  <Camera className="w-4 h-4 mr-2" />
                  Going Live on Whatnot
                </h3>
                <p className="text-sm text-gray-600">
                  You&apos;re almost ready! Here&apos;s how to start your first show:
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Steps to Go Live:</h4>
                <ol className="space-y-3 text-sm">
                  <li className="flex items-start gap-3">
                    <span className="bg-purple-100 text-purple-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0">1</span>
                    <span>Open the Whatnot mobile app</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="bg-purple-100 text-purple-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0">2</span>
                    <span>Tap the camera icon to start a show</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="bg-purple-100 text-purple-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0">3</span>
                    <span>Add a title and description</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="bg-purple-100 text-purple-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0">4</span>
                    <span>Schedule your show or go live immediately</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="bg-purple-100 text-purple-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0">5</span>
                    <span>Connect to Restream for multi-platform streaming (optional)</span>
                  </li>
                </ol>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Whatnot Best Practices:</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• Start with 5-10 items for your first show</li>
                  <li>• Engage with viewers in chat constantly</li>
                  <li>• Use the &quot;Buy Now&quot; option for quick sales</li>
                  <li>• Run giveaways to build audience</li>
                  <li>• Be energetic and authentic!</li>
                </ul>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Multi-Stream with Restream:</h4>
                <p className="text-sm text-gray-600 mb-3">
                  To stream to Whatnot AND other platforms at the same time:
                </p>
                <ol className="text-sm space-y-1 text-gray-600">
                  <li>1. Set up Restream.io account</li>
                  <li>2. Add Whatnot as a destination (custom RTMP)</li>
                  <li>3. Stream from OBS to Restream</li>
                </ol>
                <Link href="/dashboard/streaming/setup">
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
                  I&apos;m ready to go live on Whatnot!
                </Label>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
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
              <Button 
                onClick={saveStep}
                disabled={isSaving || (currentStep === 1 && !formData.step1Complete)}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            ) : (
              <Button 
                onClick={saveStep}
                disabled={isSaving || !formData.step5Complete}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Completing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Complete Setup
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
