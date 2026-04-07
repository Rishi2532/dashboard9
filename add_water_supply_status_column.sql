-- Migration Script: Add 'water_supply_status' column to scheme_status table
-- Values: Full, Partial, No
-- Run this script once on any database that does not yet have this column.

-- Step 1: Add the column (if it doesn't exist yet)
ALTER TABLE scheme_status
ADD COLUMN IF NOT EXISTS water_supply_status TEXT;

-- Verify the column was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'scheme_status'
  AND column_name = 'water_supply_status';
