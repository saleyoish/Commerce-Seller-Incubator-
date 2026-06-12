"use client";

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  redirectPath?: string;
}

export default function AuthGuard({
  children,
  requireAdmin = false,
  redirectPath = '/login',
}: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const targetRedirect = `${redirectPath}?redirect=${encodeURIComponent(pathname || '/')}`;

      console.log('[AuthGuard] Checking auth for:', pathname, 'requireAdmin:', requireAdmin, 'hasToken:', !!token);

      if (!token) {
        console.log('[AuthGuard] No token found, redirecting to:', targetRedirect);
        router.replace(targetRedirect);
        return;
      }

      try {
        const endpoint = requireAdmin ? '/api/auth/check-admin' : '/api/auth/check-user';
        console.log('[AuthGuard] Calling endpoint:', endpoint);
        const res = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
          credentials: 'omit',
        });

        console.log('[AuthGuard] Response status:', res.status);
        if (!res.ok) {
          console.log('[AuthGuard] Response not OK, redirecting to:', targetRedirect);
          router.replace(targetRedirect);
          return;
        }

        const data = await res.json();
        console.log('[AuthGuard] Response data:', data);

        if (requireAdmin) {
          if (!data.isAdmin) {
            console.log('[AuthGuard] Not admin, redirecting to /seller');
            router.replace('/seller');
            return;
          }
          setAuthorized(true);
        } else {
          setAuthorized(true);
        }
      } catch (error) {
        console.error('[AuthGuard] error:', error);
        router.replace(targetRedirect);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [pathname, redirectPath, requireAdmin, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-[var(--text-muted)]">Checking authentication…</p>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return <>{children}</>;
}
