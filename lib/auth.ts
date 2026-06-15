function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function isSameOrigin(input: RequestInfo | URL | Request): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const url = typeof input === 'string'
      ? new URL(input, window.location.origin)
      : input instanceof Request
        ? new URL(input.url, window.location.origin)
        : new URL(input.toString(), window.location.origin);

    return url.origin === window.location.origin;
  } catch {
    return false;
  }
}

export async function authFetch(input: RequestInfo, init: RequestInit = {}) {
  if (typeof window === 'undefined') return fetch(input, init);

  const headers = new Headers(init.headers || {});
  const token = localStorage.getItem('token');

  if (token && isSameOrigin(input) && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: init.credentials ?? 'omit',
  });
}

// Helper to check admin status via API (avoids RLS issues)
export const checkIsAdmin = async (): Promise<boolean> => {
  try {
    const response = await authFetch('/api/auth/check-admin', {
      credentials: 'omit',
    });
    if (!response.ok) {
      return false;
    }
    const data = await response.json();
    return data.isAdmin || false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

// Helper to check user status (seller/admin) via API (avoids RLS issues)
export interface UserStatus {
  isSeller: boolean;
  isAdmin: boolean;
  seller: any | null;
  user: { id: string; email?: string } | null;
}

export const checkUserStatus = async (): Promise<UserStatus> => {
  try {
    const response = await authFetch('/api/auth/me', {
      credentials: 'omit',
    });
    if (!response.ok) {
      return { isSeller: false, isAdmin: false, seller: null, user: null };
    }
    const data = await response.json();
    return {
      isSeller: data.isSeller || false,
      isAdmin: data.isAdmin || false,
      seller: data.seller || null,
      user: data.id ? { id: data.id, email: data.email } : null,
    };
  } catch (error) {
    console.error('Error checking user status:', error);
    return { isSeller: false, isAdmin: false, seller: null, user: null };
  }
};
