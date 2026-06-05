'use server';

import { createServerSideSupabase } from '@/lib/supabase-server';

export async function checkUserRoleAfterLogin() {
  const supabase = await createServerSideSupabase();

  try {
    // Get the authenticated user from the session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('Not authenticated. Please try logging in again.');
    }

    // Check if admin by user_id
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (admin) {
      return { role: 'admin', redirectTo: '/admin' };
    }

    // Check seller approval status by user_id
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('approval_status')
      .eq('user_id', user.id)
      .single();

    if (sellerError || !seller) {
      throw new Error('Seller record not found. Please contact support.');
    }

    if (seller.approval_status !== 'approved') {
      throw new Error('You are not approved yet. Please wait for admin approval.');
    }

    return { role: 'seller', redirectTo: '/seller' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    throw new Error(message);
  }
}
