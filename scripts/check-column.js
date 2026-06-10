require('dotenv').config();
console.log('Starting script...');

const { createClient } = require('@supabase/supabase-js');

console.log('Creating Supabase client...');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

console.log('URL:', supabaseUrl);
console.log('Key exists:', !!supabaseKey);

const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    headers: {
      'Prefer': 'return=representation'
    }
  }
});

console.log('Client created, checking column...');

async function checkColumn() {
  try {
    console.log('Checking if type column exists...');

    // Try to select the type column
    const { data, error } = await supabase
      .from('stream_sessions')
      .select('type')
      .limit(1);

    if (error) {
      console.error('Error checking type column:', error.message);
      console.error('Error details:', JSON.stringify(error, null, 2));
    } else {
      console.log('Type column exists! Data:', data);
    }
  } catch (err) {
    console.error('Failed to check column:', err);
  }
}

checkColumn().then(() => {
  console.log('Script completed');
}).catch((err) => {
  console.error('Script failed:', err);
});