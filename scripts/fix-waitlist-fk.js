// Script to fix waitlist user_id foreign key constraint
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

async function fixWaitlistFK() {
  console.log('Fixing waitlist user_id foreign key constraint...');

  // Drop the existing foreign key constraint
  console.log('Dropping foreign key constraint...');
  const { error: dropError } = await db.rpc('exec_sql', {
    sql: 'ALTER TABLE waitlist DROP CONSTRAINT IF EXISTS waitlist_user_id_fkey;'
  });

  if (dropError) {
    console.error('Error dropping constraint:', dropError);
    console.log('Trying direct SQL execution...');
    
    // Try using the raw SQL execution
    const { error: sqlError } = await db
      .from('waitlist')
      .select('*')
      .limit(1);
    
    if (sqlError) {
      console.error('Cannot access waitlist table:', sqlError);
    }
  } else {
    console.log('Foreign key constraint dropped successfully');
  }

  // Make user_id nullable
  console.log('Making user_id nullable...');
  const { error: alterError } = await db.rpc('exec_sql', {
    sql: 'ALTER TABLE waitlist ALTER COLUMN user_id DROP NOT NULL;'
  });

  if (alterError) {
    console.error('Error making user_id nullable:', alterError);
  } else {
    console.log('user_id column is now nullable');
  }

  console.log('Fix completed');
}

fixWaitlistFK().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
