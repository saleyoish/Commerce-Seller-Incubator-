// Script to check users in database and their password_hash status
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const db = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
  console.log('Checking sellers table...');
  const { data: sellers, error: sellersError } = await db
    .from('sellers')
    .select('id, user_id, email, password_hash, is_temp_password, approval_status')
    .limit(10);

  if (sellersError) {
    console.error('Error fetching sellers:', sellersError);
  } else {
    console.log('Sellers found:', sellers.length);
    sellers.forEach(seller => {
      console.log(`- Email: ${seller.email}`);
      console.log(`  User ID: ${seller.user_id}`);
      console.log(`  Password Hash: ${seller.password_hash ? 'EXISTS' : 'NULL'}`);
      console.log(`  Is Temp Password: ${seller.is_temp_password}`);
      console.log(`  Approval Status: ${seller.approval_status}`);
      console.log('');
    });
  }

  console.log('\nChecking admins table...');
  const { data: admins, error: adminsError } = await db
    .from('admins')
    .select('id, user_id, email, password_hash')
    .limit(10);

  if (adminsError) {
    console.error('Error fetching admins:', adminsError);
  } else {
    console.log('Admins found:', admins.length);
    admins.forEach(admin => {
      console.log(`- Email: ${admin.email}`);
      console.log(`  User ID: ${admin.user_id}`);
      console.log(`  Password Hash: ${admin.password_hash ? 'EXISTS' : 'NULL'}`);
      console.log('');
    });
  }
}

checkUsers().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
