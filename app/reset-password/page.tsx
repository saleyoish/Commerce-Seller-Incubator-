'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PasswordInput } from '@/components/ui/password-input';
import { Sparkles, KeyRound, CheckCircle, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = searchParams.get('token');
    if (!t) {
      setError('No reset token found. Please use the link from your email.');
    } else {
      setToken(t);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (!token) {
      setError('Invalid reset link. Please request a new one.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] p-4 animate-fade-in-up">
      <div className="w-full max-w-md">

        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-[#7C3AED] to-[#06B6D4] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.3)]">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold gradient-text text-xl">Isellish</span>
        </div>

        <div className="card-premium">
          <div className="text-center pb-6 border-b border-[var(--border-default)] mb-6">
            <div className="w-12 h-12 rounded-xl bg-[rgba(124,58,237,0.12)] flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-6 h-6 text-[var(--accent-primary)]" />
            </div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Set New Password</h1>
            <p className="text-sm text-[var(--text-muted)] mt-2">Enter your new password below</p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2 px-4 py-3 rounded-lg border border-[var(--accent-danger)] bg-[rgba(239,68,68,0.08)] text-[var(--accent-danger)] text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-5 flex items-start gap-2 px-4 py-3 rounded-lg border border-[var(--accent-success)] bg-[rgba(16,185,129,0.08)] text-[var(--accent-success)] text-sm">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Password reset successful! Redirecting to login…</span>
            </div>
          )}

          {!token && error && (
            <div className="text-center mt-2">
              <a href="/forgot-password" className="text-sm text-[var(--accent-primary)] hover:underline flex items-center justify-center gap-1">
                <ArrowLeft className="w-4 h-4" />
                Request new reset link
              </a>
            </div>
          )}

          {token && !success && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <PasswordInput
                label="New Password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <PasswordInput
                label="Confirm Password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="submit"
                className="w-full btn-primary py-2.5 flex items-center justify-center gap-2 disabled:opacity-60"
                disabled={isLoading || success}
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isLoading ? 'Resetting…' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
