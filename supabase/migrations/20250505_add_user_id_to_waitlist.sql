-- Add user_id column to waitlist table
-- This links waitlist entries to auth users

ALTER TABLE waitlist
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_user_id ON waitlist(user_id);

-- Update RLS policies to allow the API to insert with user_id
-- Note: Make sure your service role key is used for the API route
