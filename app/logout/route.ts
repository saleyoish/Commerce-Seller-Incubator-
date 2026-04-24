import { createServerSideSupabase } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

export async function GET() {
  const supabase = await createServerSideSupabase();
  await supabase.auth.signOut();
  redirect('/login');
}
