// Client-side auth helpers using custom JWT
// Drop-in replacement for supabase.auth.getUser() calls in client components

export interface AuthUser {
  id: string;
  email: string;
  isAdmin: boolean;
  isSeller: boolean;
  is_temp_password?: boolean;
  approval_status?: string;
  seller?: Record<string, unknown> | null;
}

function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Get the current authenticated user from the JWT token.
 * Returns null if not authenticated.
 * Use this in client components instead of supabase.auth.getUser().
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const res = await fetch('/api/auth/me', {
      headers: getAuthHeaders(),
      credentials: 'omit',
    });
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
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
  }
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'omit' });
}
