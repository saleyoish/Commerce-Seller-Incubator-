-- Remove foreign key constraints for custom JWT authentication
-- Since we're not using Supabase Auth, we need to remove the dependency on auth.users

-- Drop foreign key constraint from admins table
ALTER TABLE admins DROP CONSTRAINT IF EXISTS admins_user_id_fkey;

-- Drop foreign key constraint from sellers table  
ALTER TABLE sellers DROP CONSTRAINT IF EXISTS sellers_user_id_fkey;

-- Make user_id nullable and remove NOT NULL constraint
ALTER TABLE admins ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE sellers ALTER COLUMN user_id DROP NOT NULL;

-- Add password_hash column to admins if it doesn't exist
ALTER TABLE admins ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Add password_hash column to sellers if it doesn't exist
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Add is_temp_password column to sellers if it doesn't exist
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS is_temp_password BOOLEAN DEFAULT FALSE;

-- Add last_login column to sellers if it doesn't exist
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
