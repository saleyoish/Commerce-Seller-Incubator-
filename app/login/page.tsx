"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PasswordInput } from '@/components/ui/password-input';
import { useAuth } from '@/context/AuthContext';
import {
  Sparkles,
  ShieldCheck,
  Zap,
  BarChart2,
  Globe,
  Loader2,
} from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const features = [
  { icon: Zap,         text: 'Go live on TikTok Shop in minutes' },
  { icon: BarChart2,   text: 'Real-time sales analytics dashboard' },
  { icon: Globe,       text: 'Multi-platform streaming support' },
  { icon: ShieldCheck, text: 'Secure weekly payouts via Stripe' },
];

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await login(data.email, data.password);
      if (!result.success) throw new Error(result.error || 'Invalid email or password');

      const user = (result as any).user;
      
      if (user?.isAdmin) {
        window.location.href = '/admin';
      } else if (user?.is_temp_password) {
        window.location.href = '/seller?change_password=true';
      } else {
        window.location.href = '/seller';
      }
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex animate-fade-in-up">

      {/* ── Left panel: branding ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[var(--bg-surface)]">
        <div className="pointer-events-none absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#7C3AED]/15 via-transparent to-[#06B6D4]/15" />
        <div className="pointer-events-none absolute top-1/4 left-1/4 w-80 h-80 bg-[#7C3AED]/10 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#06B6D4]/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 bg-gradient-to-br from-[#7C3AED] to-[#06B6D4] rounded-xl flex items-center justify-center shadow-[0_0_24px_rgba(124,58,237,0.4)]">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold gradient-text text-2xl">Isellish</span>
          </div>

          <h2 className="text-4xl xl:text-5xl font-semibold text-[var(--text-primary)] mb-4 leading-tight">
            Welcome<br />
            <span className="gradient-text">Back.</span>
          </h2>

          <p className="text-[var(--text-secondary)] text-lg mb-10 max-w-md">
            Log in to access your seller dashboard, manage products, and go live with your audience.
          </p>

          <div className="space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-lg bg-[var(--bg-raised)] border border-[var(--border-default)] flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-[var(--accent-primary)]" />
                </div>
                <span className="text-[var(--text-secondary)] text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-[var(--bg-base)] p-4 sm:p-8">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-[#7C3AED] to-[#06B6D4] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.3)]">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold gradient-text text-xl">Isellish</span>
          </div>

          <div className="card-premium">
            <div className="text-center pb-6 border-b border-[var(--border-default)] mb-6">
              <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Welcome Back</h1>
              <p className="text-sm text-[var(--text-muted)] mt-2">Access your seller or admin dashboard</p>
            </div>

            {error && (
              <div className="mb-5 px-4 py-3 rounded-lg border border-[var(--accent-danger)] bg-[rgba(239,68,68,0.08)] text-[var(--accent-danger)] text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-[var(--text-secondary)]">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="input-premium"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-[var(--accent-danger)]">{errors.email.message}</p>
                )}
              </div>

              <PasswordInput
                label="Password"
                placeholder="••••••••"
                error={errors.password?.message}
                {...register('password')}
              />

              <button
                type="submit"
                className="w-full btn-primary py-2.5 flex items-center justify-center gap-2 disabled:opacity-60 mt-1"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isLoading ? 'Logging in…' : 'Log In'}
              </button>
            </form>

            <div className="mt-6 space-y-3 text-center text-sm">
              <p>
                <a href="/forgot-password" className="text-[var(--accent-primary)] hover:underline transition-colors">
                  Forgot password?
                </a>
              </p>
              <p className="text-[var(--text-muted)]">
                Don&apos;t have an account?{' '}
                <a href="/signup" className="text-[var(--accent-primary)] hover:underline transition-colors font-medium">
                  Sign up as Seller
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
