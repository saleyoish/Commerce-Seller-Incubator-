// Simple script to fix password without TypeScript compilation
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const db = createClient(supabaseUrl, supabaseKey);

async function fixPassword() {
  // Allow providing email/password via env or command-line args
  // Priority: CLI args (> node script.js user@example.com pass) -> ENV vars -> fail
  const argv = process.argv.slice(2);
  const email = argv[0] || process.env.TARGET_EMAIL;
  const password = argv[1] || process.env.TARGET_PASSWORD;

  if (!email || !password) {
    console.error('Usage: node scripts/simple-fix-password.js <email> <password> OR set TARGET_EMAIL and TARGET_PASSWORD in .env.local');
    process.exit(1);
  }

  console.log('Checking current user state...');
  const { data: user, error: checkError } = await db
    .from('sellers')
    .select('id, user_id, email, password_hash, approval_status')
    .eq('email', email)
    .maybeSingle();

  if (checkError) {
    console.error('Error checking user:', checkError);
    process.exit(1);
  }

  console.log('Current user data:', JSON.stringify(user, null, 2));

  if (!user) {
    console.error('User not found!');
    process.exit(1);
  }

  console.log('Hashing password...');
  const passwordHash = await bcrypt.hash(password, 10);
  console.log('Password hash generated:', passwordHash.substring(0, 20) + '...');

  console.log('Updating password in database...');
  const { data: updateData, error: updateError } = await db
    .from('sellers')
    .update({ 
      password_hash: passwordHash,
      is_temp_password: false,
      updated_at: new Date().toISOString()
    })
    .eq('email', email)
    .select();

  if (updateError) {
    console.error('Error updating password:', updateError);
    process.exit(1);
  }

  console.log('Password updated successfully!');
  console.log('Updated user:', JSON.stringify(updateData, null, 2));
  process.exit(0);
}

fixPassword().catch(console.error);
