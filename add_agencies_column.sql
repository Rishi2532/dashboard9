-- Migration Script: Add 'agency_type' column to scheme_status table
-- Values: MJP or ZP
-- Run this script once on any database that does not yet have this column.

-- Step 1: Add the column (if it doesn't exist yet)
ALTER TABLE scheme_status
ADD COLUMN IF NOT EXISTS agency_type TEXT;

-- Step 2: If you already ran the old 'agencies' version, rename it instead:
-- ALTER TABLE scheme_status RENAME COLUMN agencies TO agency_type;

-- Verify the column was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'scheme_status'
  AND column_name = 'agency_type';
