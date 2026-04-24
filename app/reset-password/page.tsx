'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientSideSupabase } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

      // Parse hash parameters from URL (Supabase sends token in hash)
      const hash = window.location.hash;
      const hashParams = new URLSearchParams(hash.substring(1)); // Remove the #
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      // Debug logging
      console.log('Reset password - Hash params:', { type, hasAccessToken: !!accessToken });

      // Check if this is a password reset flow (type=recovery)
      if (type !== 'recovery') {
        // Check if already have a valid session (might have been set automatically)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setIsValidToken(true);
          setIsLoading(false);
          return;
        }
        
        if (!accessToken) {
          setError('No reset token found. Please use the link from your email.');
          setIsValidToken(false);
          setIsLoading(false);
          return;
        }
        // If we have access token but no type, continue anyway
      }

      // If we have tokens in the hash, set the session
      if (accessToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (sessionError) {
          console.error('Session error:', sessionError);
          setError('Invalid or expired reset link. Please request a new one.');
          setIsValidToken(false);
        } else {
          // Verify session was set correctly
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setIsValidToken(true);
          } else {
            setError('Failed to establish session. Please request a new reset link.');
            setIsValidToken(false);
          }
        }
      } else {
        // Check if already have a valid session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setIsValidToken(true);
        } else {
          setError('No reset token found. Please use the link from your email.');
          setIsValidToken(false);
        }
      }
      setIsLoading(false);
    };

    setupSession();

    // Listen for hash changes (in case user clicks link again or navigates)
    const handleHashChange = () => {
      setupSession();
    };
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
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        throw error;
      }

      // Sign out after password reset
      await supabase.auth.signOut();

      setSuccess(true);
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Set New Password</CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">
                Password reset successful! Redirecting to login...
              </AlertDescription>
            </Alert>
          )}

          {!isValidToken && error && (
            <div className="mt-4 text-center">
              <a href="/forgot-password" className="text-blue-600 hover:underline text-sm">
                Request new reset link
              </a>
            </div>
          )}

          {!isValidToken && !error && (
            <Alert className="mb-4">
              <AlertDescription>Validating reset link...</AlertDescription>
            </Alert>
          )}

          {isValidToken && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || success}>
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
