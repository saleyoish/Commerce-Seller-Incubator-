-- Fix waitlist user_id foreign key constraint for custom JWT auth
-- The waitlist table has a foreign key to auth.users, but we're using custom auth with sellers table

-- Drop the existing foreign key constraint
ALTER TABLE waitlist DROP CONSTRAINT IF EXISTS waitlist_user_id_fkey;

-- Make user_id nullable (since waitlist entries are created before seller accounts)
ALTER TABLE waitlist ALTER COLUMN user_id DROP NOT NULL;

-- Optionally add a foreign key to sellers table instead (uncomment if needed)
-- ALTER TABLE waitlist ADD CONSTRAINT waitlist_user_id_fkey 
--   FOREIGN KEY (user_id) REFERENCES sellers(user_id) ON DELETE SET NULL;
