// Client-side auth helpers using custom JWT
// Drop-in replacement for supabase.auth.getUser() calls in client components

export interface AuthUser {
  id: string;
  email: string;
  isAdmin: boolean;
  isSeller: boolean;
  is_temp_password?: boolean;
  approval_status?: string;
  seller?: any;
}

/**
 * Get the current authenticated user from the JWT cookie.
 * Returns null if not authenticated.
 * Use this in client components instead of supabase.auth.getUser().
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      id: data.id,
      email: data.email,
      isAdmin: data.isAdmin ?? false,
      isSeller: data.isSeller ?? false,
      is_temp_password: data.is_temp_password ?? false,
      approval_status: data.approval_status,
      seller: data.seller ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Sign out the current user.
 */
export async function signOut(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
}
