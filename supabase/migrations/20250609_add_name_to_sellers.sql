-- Add name column to sellers table for custom auth
ALTER TABLE sellers 
ADD COLUMN IF NOT EXISTS name TEXT;
