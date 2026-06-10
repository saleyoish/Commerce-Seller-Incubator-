-- Fix sellers user_id foreign key constraint for custom JWT auth
-- The sellers table has a foreign key to auth.users, but we're using custom auth

-- Drop the existing foreign key constraint
ALTER TABLE sellers DROP CONSTRAINT IF EXISTS sellers_user_id_fkey;

-- Make user_id nullable if needed (uncomment if you want to allow NULL)
-- ALTER TABLE sellers ALTER COLUMN user_id DROP NOT NULL;
