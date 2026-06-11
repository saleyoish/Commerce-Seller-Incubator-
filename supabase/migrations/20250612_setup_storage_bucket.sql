-- Setup product-images storage bucket and policies
-- Note: Storage buckets must be created via Supabase Dashboard or Management API
-- This migration sets up the RLS policies for the bucket

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to upload images to product-images bucket
CREATE POLICY IF NOT EXISTS "Authenticated users can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);

-- Policy: Allow sellers to view their own product images
CREATE POLICY IF NOT EXISTS "Sellers can view their own product images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (
    -- Allow if the object path starts with their seller ID (from auth.uid())
    -- The path format is: {seller_id}/{timestamp}-{filename}
    name ~ ('^' || (SELECT id FROM sellers WHERE user_id = auth.uid()) || '/')
    OR auth.role() = 'service_role'
  )
);

-- Policy: Allow sellers to delete their own product images
CREATE POLICY IF NOT EXISTS "Sellers can delete their own product images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (
    name ~ ('^' || (SELECT id FROM sellers WHERE user_id = auth.uid()) || '/')
    OR auth.role() = 'service_role'
  )
);

-- Policy: Allow service role full access
CREATE POLICY IF NOT EXISTS "Service role full access to product images"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'product-images')
WITH CHECK (bucket_id = 'product-images');

-- Grant permissions on the bucket
GRANT USAGE ON SCHEMA storage TO authenticated, service_role;
GRANT ALL ON SCHEMA storage TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO service_role;
