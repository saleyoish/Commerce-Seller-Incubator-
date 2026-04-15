-- Add stream configuration fields to sellers table
ALTER TABLE sellers
ADD COLUMN IF NOT EXISTS stream_embed_url TEXT,
ADD COLUMN IF NOT EXISTS schedule_text TEXT DEFAULT 'Live shows: Check back for schedule';

-- Update existing rows to have a default schedule text
UPDATE sellers 
SET schedule_text = 'Live shows: Check back for schedule' 
WHERE schedule_text IS NULL;
