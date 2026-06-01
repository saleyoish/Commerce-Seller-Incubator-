-- Add Whatnot seller fields to sellers table

ALTER TABLE sellers 
ADD COLUMN IF NOT EXISTS whatnot_seller_status TEXT DEFAULT 'not_registered',
ADD COLUMN IF NOT EXISTS whatnot_username TEXT,
ADD COLUMN IF NOT EXISTS whatnot_display_name TEXT,
ADD COLUMN IF NOT EXISTS whatnot_email TEXT,
ADD COLUMN IF NOT EXISTS whatnot_phone TEXT,
ADD COLUMN IF NOT EXISTS whatnot_business_address TEXT;

-- Add comments for documentation
COMMENT ON COLUMN sellers.whatnot_seller_status IS 'Whatnot seller registration status';
COMMENT ON COLUMN sellers.whatnot_username IS 'Whatnot username';
COMMENT ON COLUMN sellers.whatnot_display_name IS 'Whatnot display name';
COMMENT ON COLUMN sellers.whatnot_email IS 'Whatnot account email';
COMMENT ON COLUMN sellers.whatnot_phone IS 'Whatnot account phone';
COMMENT ON COLUMN sellers.whatnot_business_address IS 'Whatnot business address';
