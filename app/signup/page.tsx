'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import WaitlistSuccess from '@/components/WaitlistSuccess';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Sparkles, Check, Video, DollarSign, Globe, TrendingUp, ArrowRight, CheckCircle } from 'lucide-react';

const benefits = [
  { icon: Video, text: "Stream to multiple platforms simultaneously" },
  { icon: DollarSign, text: "Keep up to 85% of your sales revenue" },
  { icon: Globe, text: "Reach global audiences with live selling" },
  { icon: TrendingUp, text: "AI-powered clip generation for social media" },
];

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    whatYouSell: '',
    hasLiveExperience: 'no',
    consent: false,
  });

  // Get referral code from URL query params
  useEffect(() => {
    const ref = searchParams.get('ref');
    console.log('URL search params:', searchParams.toString());
    console.log('Ref param:', ref);
    if (ref) {
      setReferralCode(ref);
      console.log('Referral code set:', ref);
    }
  }, [searchParams]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRadioChange = (value: string) => {
    setFormData(prev => ({ ...prev, hasLiveExperience: value }));
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, consent: checked }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    console.log('Submitting signup form with referralCode:', referralCode);

    if (!formData.name || !formData.email || !formData.phone || !formData.whatYouSell) {
      setError('Please fill in all required fields');
      setIsLoading(false);
      return;
    }

    if (!formData.consent) {
      setError('You must agree to receive emails');
      setIsLoading(false);
      return;
    }

    try {
      console.log('Sending fetch request to /api/waitlist-signup');
      const response = await fetch('/api/waitlist-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Important: sends cookies with request
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          whatYouSell: formData.whatYouSell,
          hasLiveExperience: formData.hasLiveExperience === 'yes',
          referralCode: referralCode, // Pass referral code from URL
        }),
      });

      const result = await response.json();
      console.log('Signup API response:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Signup failed');
      }

      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred during signup');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return <WaitlistSuccess />;
  }

  return (
    <div className="min-h-screen flex animate-fade-in-up">
      {/* Left Side - Gradient Mesh & Benefits */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[var(--bg-surface)]">
        {/* Gradient Mesh Background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#7C3AED]/20 via-transparent to-[#06B6D4]/20" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#7C3AED]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#06B6D4]/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-[#7C3AED] to-[#06B6D4] rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold gradient-text text-2xl">Isellish</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-semibold text-[var(--text-primary)] mb-6 leading-tight">
            Join the<br />
            <span className="gradient-text">Waitlist</span>
          </h1>

          <p className="text-[var(--text-secondary)] text-lg mb-10 max-w-md">
            Limited spots available. Apply now to secure your place and start selling on TikTok Shop.
          </p>

          <div className="space-y-4">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[var(--bg-raised)] flex items-center justify-center">
                  <benefit.icon className="w-5 h-5 text-[var(--accent-primary)]" />
                </div>
                <span className="text-[var(--text-secondary)]">{benefit.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Waitlist Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-[var(--bg-base)] p-4 sm:p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-[#7C3AED] to-[#06B6D4] rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold gradient-text text-xl">Isellish</span>
          </div>

          <Card className="card-premium">
            <CardHeader className="text-center pb-6">
              <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-2">Apply Now</p>
              <CardTitle className="text-2xl font-semibold text-[var(--text-primary)]">
                Join the Waitlist
              </CardTitle>
              <CardDescription className="text-[var(--text-muted)] mt-2">
                Limited spots available. Apply now to secure your place.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {referralCode && (
                <Alert className="mb-6 bg-[rgba(16,185,129,0.1)] border-[var(--accent-success)] text-[var(--accent-success)]">
                  <AlertDescription className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Referred by friend (Code: {referralCode})
                  </AlertDescription>
                </Alert>
              )}
              {error && (
                <Alert className="mb-6 bg-[rgba(239,68,68,0.1)] border-[var(--accent-danger)] text-[var(--accent-danger)]">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={onSubmit} className="space-y-5">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-[var(--text-secondary)] text-sm font-medium">
                      Full Name *
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="John Doe"
                      className="input-premium"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[var(--text-secondary)] text-sm font-medium">
                      Email *
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="john@example.com"
                      className="input-premium"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-[var(--text-secondary)] text-sm font-medium">
                    Phone Number *
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    className="input-premium"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatYouSell" className="text-[var(--text-secondary)] text-sm font-medium">
                    What do you sell? *
                  </Label>
                  <Textarea
                    id="whatYouSell"
                    name="whatYouSell"
                    placeholder="Describe your products, categories, and typical price range..."
                    className="input-premium resize-none"
                    rows={4}
                    value={formData.whatYouSell}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-[var(--text-secondary)] text-sm font-medium">
                    Have you done live selling before? *
                  </Label>
                  <RadioGroup className="flex gap-6">
                    <RadioGroupItem 
                      name="hasLiveExperience"
                      value="yes" 
                      id="yes-experience"
                      checked={formData.hasLiveExperience === 'yes'}
                      onChange={() => handleRadioChange('yes')}
                    >
                      Yes
                    </RadioGroupItem>
                    <RadioGroupItem 
                      name="hasLiveExperience"
                      value="no" 
                      id="no-experience"
                      checked={formData.hasLiveExperience === 'no'}
                      onChange={() => handleRadioChange('no')}
                    >
                      No
                    </RadioGroupItem>
                  </RadioGroup>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox 
                    id="consent" 
                    name="consent"
                    checked={formData.consent}
                    onChange={(e) => handleCheckboxChange(e.target.checked)}
                    required
                  />
                  <Label htmlFor="consent" className="text-sm leading-tight cursor-pointer text-[var(--text-muted)]">
                    I agree to receive emails about my application and the TikTok Shop Fast Track program.
                    You can unsubscribe at any time.
                  </Label>
                </div>

                <Button 
                  type="submit" 
                  className="w-full btn-primary text-base py-3 mt-2" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating Account...
                    </span>
                  ) : (
                    <>
                      Submit Application
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <Check className="w-3 h-3 text-[var(--accent-success)]" />
                <span>By signing up, you agree to our Terms of Service and Privacy Policy</span>
              </div>

              <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
                Already have an account?{' '}
                <a 
                  href="/login" 
                  className="text-[var(--accent-primary)] hover:underline transition-colors font-medium"
                >
                  Log in
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SignupPageContent />
    </Suspense>
  );
}
