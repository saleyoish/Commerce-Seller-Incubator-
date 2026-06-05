'use server';

import { createServerSideSupabase } from '@/lib/supabase-server';

export async function checkUserRoleAfterLogin(email: string) {
  const supabase = await createServerSideSupabase();

  try {
    // Check if admin
    const { data: admin } = await supabase
      .from('admins')
      .select('id')
      .eq('email', email)
      .single();

    if (admin) {
      return { role: 'admin', redirectTo: '/admin' };
    }

    // Check seller approval status
    const { data: seller } = await supabase
      .from('sellers')
      .select('approval_status')
      .eq('email', email)
      .single();

    if (seller?.approval_status !== 'approved') {
      throw new Error('You are not approved yet. Please wait for admin approval.');
    }

    return { role: 'seller', redirectTo: '/seller' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    throw new Error(message);
  }
}
