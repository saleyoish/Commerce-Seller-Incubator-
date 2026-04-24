'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientSideSupabase } from '@/lib/supabase-client';
import { PasswordInput } from '@/components/ui/password-input';
import { Sparkles, KeyRound, CheckCircle, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);

  useEffect(() => {
    const setupSession = async () => {
      const supabase = createClientSideSupabase();
      const hash = window.location.hash;
      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      console.log('Reset password - Hash params:', { type, hasAccessToken: !!accessToken });

      if (type !== 'recovery') {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) { setIsValidToken(true); setIsLoading(false); return; }
        if (!accessToken) {
          setError('No reset token found. Please use the link from your email.');
          setIsValidToken(false); setIsLoading(false); return;
        }
      }

      if (accessToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });
        if (sessionError) {
          setError('Invalid or expired reset link. Please request a new one.');
          setIsValidToken(false);
        } else {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) setIsValidToken(true);
          else { setError('Failed to establish session. Please request a new reset link.'); setIsValidToken(false); }
        }
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) setIsValidToken(true);
        else { setError('No reset token found. Please use the link from your email.'); setIsValidToken(false); }
      }
      setIsLoading(false);
    };

    setupSession();
    const handleHashChange = () => setupSession();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClientSideSupabase();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
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

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-[#7C3AED] to-[#06B6D4] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.3)]">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold gradient-text text-xl">Live Commerce</span>
        </div>

        <div className="card-premium">
          {/* Header */}
          <div className="text-center pb-6 border-b border-[var(--border-default)] mb-6">
            <div className="w-12 h-12 rounded-xl bg-[rgba(124,58,237,0.12)] flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-6 h-6 text-[var(--accent-primary)]" />
            </div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Set New Password</h1>
            <p className="text-sm text-[var(--text-muted)] mt-2">Enter your new password below</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-start gap-2 px-4 py-3 rounded-lg border border-[var(--accent-danger)] bg-[rgba(239,68,68,0.08)] text-[var(--accent-danger)] text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="mb-5 flex items-start gap-2 px-4 py-3 rounded-lg border border-[var(--accent-success)] bg-[rgba(16,185,129,0.08)] text-[var(--accent-success)] text-sm">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Password reset successful! Redirecting to login…</span>
            </div>
          )}

          {/* Validating */}
          {isLoading && !isValidToken && !error && (
            <div className="flex items-center justify-center gap-2 py-8 text-[var(--text-muted)] text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--accent-primary)]" />
              <span>Validating reset link…</span>
            </div>
          )}

          {/* Invalid token — show link to request new one */}
          {!isLoading && !isValidToken && error && (
            <div className="text-center mt-2">
              <a href="/forgot-password" className="text-sm text-[var(--accent-primary)] hover:underline flex items-center justify-center gap-1">
                <ArrowLeft className="w-4 h-4" />
                Request new reset link
              </a>
            </div>
          )}

          {/* Form */}
          {isValidToken && !success && (
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
