-- Maharashtra Water Infrastructure Management Platform
-- Complete Database Setup Script for pgAdmin

-- Create database (Run this separately if needed)
-- CREATE DATABASE water_scheme_dashboard;

-- Connect to the database
-- \c water_scheme_dashboard;

-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL PRIMARY KEY,
  "username" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "name" TEXT,
  "role" TEXT NOT NULL DEFAULT 'user'
);

-- Create region table
CREATE TABLE IF NOT EXISTS "region" (
  "region_id" SERIAL PRIMARY KEY,
  "region_name" TEXT NOT NULL,
  "total_esr_integrated" INTEGER,
  "fully_completed_esr" INTEGER,
  "partial_esr" INTEGER,
  "total_villages_integrated" INTEGER,
  "fully_completed_villages" INTEGER,
  "total_schemes_integrated" INTEGER,
  "fully_completed_schemes" INTEGER,
  "flow_meter_integrated" INTEGER,
  "rca_integrated" INTEGER,
  "pressure_transmitter_integrated" INTEGER
);

-- Create scheme_status table (no primary key to allow duplicate entries)
CREATE TABLE IF NOT EXISTS "scheme_status" (
  "sr_no" INTEGER,
  "scheme_id" TEXT NOT NULL,
  "region" TEXT,
  "circle" TEXT,
  "division" TEXT,
  "sub_division" TEXT,
  "block" TEXT,
  "scheme_name" TEXT NOT NULL,
  "agency" TEXT,
  "number_of_village" INTEGER,
  "total_villages_integrated" INTEGER,
  "total_villages_in_scheme" INTEGER,
  "no_of_functional_village" INTEGER,
  "no_of_partial_village" INTEGER,
  "no_of_non_functional_village" INTEGER,
  "fully_completed_villages" INTEGER,
  "total_number_of_esr" INTEGER,
  "scheme_functional_status" TEXT,
  "total_esr_integrated" INTEGER,
  "no_fully_completed_esr" INTEGER,
  "balance_to_complete_esr" INTEGER,
  "flow_meters_connected" INTEGER,
  "pressure_transmitter_connected" INTEGER,
  "residual_chlorine_analyzer_connected" INTEGER,
  "fully_completion_scheme_status" TEXT,
  "mjp_commissioned" TEXT DEFAULT 'No',
  "mjp_fully_completed" TEXT DEFAULT 'In Progress',
  "water_supply" TEXT,
  "agency_type" TEXT,
  "dashboard_url" TEXT
  -- No primary key constraint to allow duplicate entries
);

-- Create app_state table for persistent app state
CREATE TABLE IF NOT EXISTS "app_state" (
  "key" TEXT PRIMARY KEY,
  "value" JSONB NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create water_scheme_data table for LPCD tracking
CREATE TABLE IF NOT EXISTS "water_scheme_data" (
  "region" TEXT,
  "circle" TEXT,
  "division" TEXT,
  "sub_division" TEXT,
  "block" TEXT,
  "scheme_id" VARCHAR(100),
  "scheme_name" TEXT,
  "village_name" TEXT,
  "population" INTEGER,
  "number_of_esr" INTEGER,
  "water_value_day1" DECIMAL(20,6),
  "water_value_day2" DECIMAL(20,6),
  "water_value_day3" DECIMAL(20,6),
  "water_value_day4" DECIMAL(20,6),
  "water_value_day5" DECIMAL(20,6),
  "water_value_day6" DECIMAL(20,6),
  "water_value_day7" DECIMAL(20,6),
  "lpcd_value_day1" DECIMAL(20,6),
  "lpcd_value_day2" DECIMAL(20,6),
  "lpcd_value_day3" DECIMAL(20,6),
  "lpcd_value_day4" DECIMAL(20,6),
  "lpcd_value_day5" DECIMAL(20,6),
  "lpcd_value_day6" DECIMAL(20,6),
  "lpcd_value_day7" DECIMAL(20,6),
  "water_date_day1" VARCHAR(20),
  "water_date_day2" VARCHAR(20),
  "water_date_day3" VARCHAR(20),
  "water_date_day4" VARCHAR(20),
  "water_date_day5" VARCHAR(20),
  "water_date_day6" VARCHAR(20),
  "water_date_day7" VARCHAR(20),
  "lpcd_date_day1" VARCHAR(20),
  "lpcd_date_day2" VARCHAR(20),
  "lpcd_date_day3" VARCHAR(20),
  "lpcd_date_day4" VARCHAR(20),
  "lpcd_date_day5" VARCHAR(20),
  "lpcd_date_day6" VARCHAR(20),
  "lpcd_date_day7" VARCHAR(20),
  "consistent_zero_lpcd_for_a_week" INTEGER,
  "below_55_lpcd_count" INTEGER,
  "above_55_lpcd_count" INTEGER,
  "dashboard_url" TEXT,
  PRIMARY KEY ("scheme_id", "village_name")
);

-- Create chlorine_data table for ESR-level chlorine monitoring
CREATE TABLE IF NOT EXISTS "chlorine_data" (
  "region" VARCHAR(100),
  "circle" VARCHAR(100),
  "division" VARCHAR(100),
  "sub_division" VARCHAR(100),
  "block" VARCHAR(100),
  "scheme_id" VARCHAR(100),
  "scheme_name" VARCHAR(255),
  "village_name" VARCHAR(255),
  "esr_name" VARCHAR(255),
  "chlorine_value_1" NUMERIC(12,2),
  "chlorine_value_2" NUMERIC(12,2),
  "chlorine_value_3" NUMERIC(12,2),
  "chlorine_value_4" NUMERIC(12,2),
  "chlorine_value_5" NUMERIC(12,2),
  "chlorine_value_6" NUMERIC(12,2),
  "chlorine_value_7" NUMERIC(12,2),
  "chlorine_date_day_1" VARCHAR(15),
  "chlorine_date_day_2" VARCHAR(15),
  "chlorine_date_day_3" VARCHAR(15),
  "chlorine_date_day_4" VARCHAR(15),
  "chlorine_date_day_5" VARCHAR(15),
  "chlorine_date_day_6" VARCHAR(15),
  "chlorine_date_day_7" VARCHAR(15),
  "number_of_consistent_zero_value_in_chlorine" INTEGER,
  "chlorine_less_than_02_mgl" NUMERIC(12,2),
  "chlorine_between_02_05_mgl" NUMERIC(12,2),
  "chlorine_greater_than_05_mgl" NUMERIC(12,2),
  "dashboard_url" TEXT,
  PRIMARY KEY ("scheme_id", "village_name", "esr_name")
);

-- Create pressure_data table for ESR-level pressure monitoring
CREATE TABLE IF NOT EXISTS "pressure_data" (
  "region" TEXT,
  "circle" TEXT,
  "division" TEXT,
  "sub_division" TEXT,
  "block" TEXT,
  "scheme_id" TEXT,
  "scheme_name" TEXT,
  "village_name" TEXT,
  "esr_name" TEXT,
  "pressure_value_1" DECIMAL(12,2),
  "pressure_value_2" DECIMAL(12,2),
  "pressure_value_3" DECIMAL(12,2),
  "pressure_value_4" DECIMAL(12,2),
  "pressure_value_5" DECIMAL(12,2),
  "pressure_value_6" DECIMAL(12,2),
  "pressure_value_7" DECIMAL(12,2),
  "pressure_date_day_1" VARCHAR(15),
  "pressure_date_day_2" VARCHAR(15),
  "pressure_date_day_3" VARCHAR(15),
  "pressure_date_day_4" VARCHAR(15),
  "pressure_date_day_5" VARCHAR(15),
  "pressure_date_day_6" VARCHAR(15),
  "pressure_date_day_7" VARCHAR(15),
  "number_of_consistent_zero_value_in_pressure" INTEGER,
  "pressure_less_than_02_bar" DECIMAL(12,2),
  "pressure_between_02_07_bar" DECIMAL(12,2),
  "pressure_greater_than_07_bar" DECIMAL(12,2),
  "dashboard_url" TEXT,
  PRIMARY KEY ("scheme_id", "village_name", "esr_name")
);

-- Create global_summary table for dashboard statistics
CREATE TABLE IF NOT EXISTS "global_summary" (
  "id" SERIAL PRIMARY KEY,
  "total_schemes_integrated" INTEGER,
  "fully_completed_schemes" INTEGER,
  "total_villages_integrated" INTEGER,
  "fully_completed_villages" INTEGER, 
  "total_esr_integrated" INTEGER,
  "fully_completed_esr" INTEGER,
  "flow_meter_integrated" INTEGER,
  "rca_integrated" INTEGER,
  "pressure_transmitter_integrated" INTEGER
);
CREATE TABLE IF NOT EXISTS scheme_lpcd_data_history (
  -- Primary key
  id SERIAL PRIMARY KEY,

  -- Location hierarchy
  region VARCHAR(100),
  circle VARCHAR(100),
  division VARCHAR(100),
  sub_division VARCHAR(100),
  block VARCHAR(100),

  -- Scheme identification
  scheme_id VARCHAR(100),
  scheme_name VARCHAR(255),

  -- Aggregated metrics
  total_population INTEGER,
  total_villages INTEGER,
  villages_below_55 INTEGER,
  villages_above_55 INTEGER,
  villages_zero_supply INTEGER,

  -- Single day data
  data_date VARCHAR(15) NOT NULL,
  water_value DECIMAL(20,6), -- Total water supply for the scheme
  lpcd_value DECIMAL(20,6),  -- Calculated LPCD for the scheme

  -- Upload tracking
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  upload_batch_id VARCHAR(50), -- To group records from same CSV upload

  -- Additional scheme information
  dashboard_url TEXT,
  mjp_commissioned TEXT,

  -- Unique constraint to prevent duplicate entries
  UNIQUE(scheme_id, block, data_date, uploaded_at)
);
-- Create default admin user
INSERT INTO "users" ("username", "password", "name", "role")
VALUES ('admin', 'admin123', 'Administrator', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Populate sample region data
INSERT INTO "region" ("region_name", "total_esr_integrated", "fully_completed_esr", "partial_esr", 
                     "total_villages_integrated", "fully_completed_villages", "total_schemes_integrated", 
                     "fully_completed_schemes", "flow_meter_integrated", "rca_integrated", "pressure_transmitter_integrated")
VALUES 
  ('Nagpur', 117, 58, 58, 91, 38, 15, 9, 113, 113, 63),
  ('Chhatrapati Sambhajinagar', 147, 73, 69, 140, 71, 10, 2, 132, 138, 93),
  ('Pune', 97, 31, 66, 53, 16, 9, 0, 95, 65, 49),
  ('Konkan', 11, 1, 10, 11, 0, 4, 0, 11, 10, 3),
  ('Amravati', 149, 59, 86, 121, 24, 11, 1, 143, 95, 111),
  ('Nashik', 106, 23, 46, 76, 4, 14, 1, 81, 82, 38)
ON CONFLICT DO NOTHING;
CREATE INDEX IF NOT EXISTS idx_scheme_lpcd_history_date_range 
ON scheme_lpcd_data_history (data_date, scheme_id, block);

-- Index for efficient latest record queries
CREATE INDEX IF NOT EXISTS idx_scheme_lpcd_history_latest 
ON scheme_lpcd_data_history (scheme_id, block, data_date, uploaded_at DESC);

-- Index for region filtering
CREATE INDEX IF NOT EXISTS idx_scheme_lpcd_history_region 
ON scheme_lpcd_data_history (region);

-- Index for scheme_id lookups
CREATE INDEX IF NOT EXISTS idx_scheme_lpcd_history_scheme_id 
ON scheme_lpcd_data_history (scheme_id);

-- Comments for table documentation
COMMENT ON TABLE scheme_lpcd_data_history IS 'Historical aggregated LPCD data at the scheme level';
COMMENT ON COLUMN scheme_lpcd_data_history.scheme_id IS 'Unique identifier for the water scheme';
COMMENT ON COLUMN scheme_lpcd_data_history.block IS 'Block name where the scheme operates';
COMMENT ON COLUMN scheme_lpcd_data_history.total_population IS 'Total population served by the scheme';
COMMENT ON COLUMN scheme_lpcd_data_history.total_villages IS 'Total number of villages in the scheme';
COMMENT ON COLUMN scheme_lpcd_data_history.villages_below_55 IS 'Number of villages with LPCD below 55';
COMMENT ON COLUMN scheme_lpcd_data_history.villages_above_55 IS 'Number of villages with LPCD above 55';
COMMENT ON COLUMN scheme_lpcd_data_history.villages_zero_supply IS 'Number of villages with zero water supply';
COMMENT ON COLUMN scheme_lpcd_data_history.data_date IS 'Date of the data in format DD-Mon (e.g., 7-Oct)';
COMMENT ON COLUMN scheme_lpcd_data_history.water_value IS 'Total water supply value for the scheme';
COMMENT ON COLUMN scheme_lpcd_data_history.lpcd_value IS 'Calculated LPCD value for the scheme';
COMMENT ON COLUMN scheme_lpcd_data_history.uploaded_at IS 'Timestamp when the record was uploaded';
COMMENT ON COLUMN scheme_lpcd_data_history.upload_batch_id IS 'Batch ID to group records from the same upload';
COMMENT ON COLUMN scheme_lpcd_data_history.dashboard_url IS 'URL to access the PI Vision dashboard for this scheme';
COMMENT ON COLUMN scheme_lpcd_data_history.mjp_commissioned IS 'MJP commissioning status (Yes/No)';
