"use client";

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

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
  const { user, loading } = useAuth();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const targetRedirect = `${redirectPath}?redirect=${encodeURIComponent(pathname || '/')}`;

    if (loading) return;

    if (!user) {
      router.replace(targetRedirect);
      return;
    }

    if (requireAdmin && !user.isAdmin) {
      router.replace('/seller');
      return;
    }

    setAuthorized(true);
  }, [loading, user, pathname, redirectPath, requireAdmin, router]);

  if (loading) {
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
