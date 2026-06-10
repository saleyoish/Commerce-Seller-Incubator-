// Script to check and fix password hash for a user
import { db } from '../lib/db';
import { hashPassword } from '../lib/password';

async function checkAndFixPassword() {
  const email = 'imrabiariazdev@gmail.com';
  const password = 'BIYA1379';

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

  if (!user.password_hash) {
    console.log('Password hash is null, setting new password...');
    const passwordHash = await hashPassword(password);
    console.log('Password hash generated:', passwordHash.substring(0, 20) + '...');

    const { data: updateData, error: updateError } = await db
      .from('sellers')
      .update({ password_hash: passwordHash })
      .eq('email', email)
      .select();

    if (updateError) {
      console.error('Error updating password:', updateError);
      process.exit(1);
    }

    console.log('Password updated successfully!');
    console.log('Updated user:', JSON.stringify(updateData, null, 2));
  } else {
    console.log('Password hash already exists, no update needed');
  }

  process.exit(0);
}

checkAndFixPassword().catch(console.error);
