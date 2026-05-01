'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClientSideSupabase } from '@/lib/supabase-client';
import posthog from 'posthog-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Check, Video, DollarSign, Globe, TrendingUp } from 'lucide-react';

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type SignupFormData = z.infer<typeof signupSchema>;

const benefits = [
  { icon: Video, text: "Stream to multiple platforms simultaneously" },
  { icon: DollarSign, text: "Keep up to 85% of your sales revenue" },
  { icon: Globe, text: "Reach global audiences with live selling" },
  { icon: TrendingUp, text: "AI-powered clip generation for social media" },
];

export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClientSideSupabase();

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          phone: data.phone,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Signup failed');
      }

      await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      posthog.identify(data.email, { email: data.email, phone: data.phone });
      posthog.capture('seller_signed_up', {
        email: data.email,
      });

      router.push('/dashboard?onboarding=true');
    } catch (err: any) {
      setError(err.message || 'An error occurred during signup');
    } finally {
      setIsLoading(false);
    }
  };

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
            <span className="font-bold gradient-text text-2xl">Live Commerce</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-semibold text-[var(--text-primary)] mb-6 leading-tight">
            Sell Live.<br />
            <span className="gradient-text">Grow Fast.</span>
          </h1>

          <p className="text-[var(--text-secondary)] text-lg mb-10 max-w-md">
            Join thousands of sellers using our platform to reach millions of buyers through live commerce.
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

      {/* Right Side - Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-[var(--bg-base)] p-4 sm:p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-[#7C3AED] to-[#06B6D4] rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold gradient-text text-xl">Live Commerce</span>
          </div>

          <Card className="card-premium">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl font-semibold text-[var(--text-primary)]">
                Become a Seller
              </CardTitle>
              <CardDescription className="text-[var(--text-muted)] mt-2">
                Start your live selling journey today
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert className="mb-6 bg-[rgba(239,68,68,0.1)] border-[var(--accent-danger)] text-[var(--accent-danger)]">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[var(--text-secondary)] text-sm font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="input-premium"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-sm text-[var(--accent-danger)]">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-[var(--text-secondary)] text-sm font-medium">
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    className="input-premium"
                    {...register('phone')}
                  />
                  {errors.phone && (
                    <p className="text-sm text-[var(--accent-danger)]">{errors.phone.message}</p>
                  )}
                </div>

                <PasswordInput
                  label="Password"
                  placeholder="••••••••"
                  error={errors.password?.message}
                  {...register('password')}
                />

                <PasswordInput
                  label="Confirm Password"
                  placeholder="••••••••"
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword')}
                />

                <Button 
                  type="submit" 
                  className="w-full btn-primary mt-2" 
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
                    'Create Account'
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
