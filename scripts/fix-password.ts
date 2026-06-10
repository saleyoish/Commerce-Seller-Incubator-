// Script to fix password hash for a user
import { db } from '../lib/db';
import { hashPassword } from '../lib/password';

async function fixPassword() {
  const email = 'imrabiariazdev@gmail.com';
  const password = 'BIYA1379';

  console.log('Hashing password...');
  const passwordHash = await hashPassword(password);
  console.log('Password hash generated:', passwordHash.substring(0, 20) + '...');

  console.log('Updating user in database...');
  const { data, error } = await db
    .from('sellers')
    .update({ password_hash: passwordHash })
    .eq('email', email)
    .select();

  if (error) {
    console.error('Error updating password:', error);
    process.exit(1);
  }

  console.log('Password updated successfully for:', email);
  console.log('Updated user:', data);
  process.exit(0);
}

fixPassword().catch(console.error);
