// Script to fix database schema for custom JWT authentication
// Run with: node scripts/fix-schema.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const db = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function fixSchema() {
  console.log('Fixing database schema for custom JWT authentication...');
  
  try {
    // Try to execute SQL using POST to the REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseSecretKey,
        'Authorization': `Bearer ${supabaseSecretKey}`,
      },
      body: JSON.stringify({
        sql: `
          ALTER TABLE admins DROP CONSTRAINT IF EXISTS admins_user_id_fkey;
          ALTER TABLE sellers DROP CONSTRAINT IF EXISTS sellers_user_id_fkey;
          ALTER TABLE admins ALTER COLUMN user_id DROP NOT NULL;
          ALTER TABLE sellers ALTER COLUMN user_id DROP NOT NULL;
          ALTER TABLE admins ADD COLUMN IF NOT EXISTS password_hash TEXT;
          ALTER TABLE sellers ADD COLUMN IF NOT EXISTS password_hash TEXT;
          ALTER TABLE sellers ADD COLUMN IF NOT EXISTS is_temp_password BOOLEAN DEFAULT FALSE;
          ALTER TABLE sellers ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
        `
      })
    });
    
    if (response.ok) {
      console.log('Schema fix completed successfully');
    } else {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
  } catch (error) {
    console.error('Error executing SQL via API:', error.message);
    console.log('\nPlease run these SQL commands manually in Supabase SQL Editor:');
    console.log(`
-- Drop foreign key constraints
ALTER TABLE admins DROP CONSTRAINT IF EXISTS admins_user_id_fkey;
ALTER TABLE sellers DROP CONSTRAINT IF EXISTS sellers_user_id_fkey;

-- Make user_id nullable
ALTER TABLE admins ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE sellers ALTER COLUMN user_id DROP NOT NULL;

-- Add password_hash column if not exists
ALTER TABLE admins ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Add is_temp_password column if not exists
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS is_temp_password BOOLEAN DEFAULT FALSE;

-- Add last_login column if not exists
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
    `);
  }
}

fixSchema().catch(console.error);
