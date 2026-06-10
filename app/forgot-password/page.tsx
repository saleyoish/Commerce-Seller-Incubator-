'use client';

import { useState } from 'react';
import { Sparkles, Mail, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || hasRequested) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reset email');

      setSuccess(true);
      setHasRequested(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
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
          <span className="font-bold gradient-text text-xl">Live Commerce</span>
        </div>

        <div className="card-premium">
          <div className="text-center pb-6 border-b border-[var(--border-default)] mb-6">
            <div className="w-12 h-12 rounded-xl bg-[rgba(124,58,237,0.12)] flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-[var(--accent-primary)]" />
            </div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Reset Password</h1>
            <p className="text-sm text-[var(--text-muted)] mt-2">
              Enter your email and we&apos;ll send you a reset link
            </p>
          </div>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-lg border border-[var(--accent-danger)] bg-[rgba(239,68,68,0.08)] text-[var(--accent-danger)] text-sm">
              {error}
            </div>
          )}

          {success ? (
            <div className="space-y-5">
              <div className="flex items-start gap-3 px-4 py-4 rounded-lg border border-[var(--accent-success)] bg-[rgba(16,185,129,0.08)] text-[var(--accent-success)]">
                <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold mb-0.5">Reset link sent!</p>
                  <p className="opacity-80">Check your email inbox and spam folder. The link expires in 1 hour.</p>
                </div>
              </div>
              <a href="/login" className="flex items-center justify-center gap-2 text-sm text-[var(--accent-primary)] hover:underline">
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-secondary)]">Email address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input-premium"
                />
              </div>

              <button
                type="submit"
                className="w-full btn-primary py-2.5 flex items-center justify-center gap-2 disabled:opacity-60"
                disabled={isLoading || hasRequested}
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <a href="/login" className="flex items-center justify-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </a>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
