function getAuthHeaders() {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Helper to check admin status via API (avoids RLS issues)
export const checkIsAdmin = async (): Promise<boolean> => {
  try {
    const response = await fetch('/api/auth/check-admin', {
      headers: getAuthHeaders(),
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
    const response = await fetch('/api/auth/check-user', {
      headers: getAuthHeaders(),
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
      user: data.user || null,
    };
  } catch (error) {
    console.error('Error checking user status:', error);
    return { isSeller: false, isAdmin: false, seller: null, user: null };
  }
};
