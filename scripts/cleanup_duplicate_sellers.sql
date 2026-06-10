-- Script to clean up duplicate sellers in the database
-- This script identifies and removes duplicate seller records for the same user_id
-- keeping the most recent seller with valid restream_stream_key, or the most recent if none have it

-- First, let's see what duplicates exist
SELECT
  user_id,
  COUNT(*) as duplicate_count,
  STRING_AGG(id::text, ', ' ORDER BY created_at DESC) as seller_ids,
  STRING_AGG(COALESCE(restream_stream_key, 'NULL'), ', ' ORDER BY created_at DESC) as stream_keys
FROM sellers
GROUP BY user_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Create a temporary table to identify which sellers to keep
CREATE TEMP TABLE sellers_to_keep AS
WITH ranked_sellers AS (
  SELECT
    id,
    user_id,
    created_at,
    restream_stream_key,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY
        -- First priority: has valid stream key
        CASE WHEN restream_stream_key IS NOT NULL
                  AND restream_stream_key != 'NOT_CONFIGURED'
                  AND LENGTH(restream_stream_key) > 10
             THEN 1 ELSE 0 END DESC,
        -- Second priority: most recent
        created_at DESC
    ) as priority_rank
  FROM sellers
)
SELECT id, user_id
FROM ranked_sellers
WHERE priority_rank = 1;

-- Show what will be kept
SELECT
  s.id,
  s.user_id,
  s.email,
  s.restream_stream_key,
  s.created_at,
  'KEEP' as action
FROM sellers s
JOIN sellers_to_keep stk ON s.id = stk.id
ORDER BY s.user_id;

-- Show what will be deleted
SELECT
  s.id,
  s.user_id,
  s.email,
  s.restream_stream_key,
  s.created_at,
  'DELETE' as action
FROM sellers s
LEFT JOIN sellers_to_keep stk ON s.id = stk.id
WHERE stk.id IS NULL
ORDER BY s.user_id;

-- Delete the duplicates (uncomment the line below to actually delete)
-- DELETE FROM sellers
-- WHERE id NOT IN (SELECT id FROM sellers_to_keep);

-- Clean up temp table
DROP TABLE sellers_to_keep;

-- Verify the cleanup
SELECT
  user_id,
  COUNT(*) as remaining_count
FROM sellers
GROUP BY user_id
HAVING COUNT(*) > 1
ORDER BY remaining_count DESC;