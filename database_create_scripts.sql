-- ================================
-- Maharashtra Water Infrastructure Management Platform
-- Complete Database Schema - CREATE TABLE Scripts
-- ================================

-- 1. Users table with admin role
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT,
    role TEXT NOT NULL DEFAULT 'user'
);

-- 2. Region table - regional water infrastructure summaries
CREATE TABLE IF NOT EXISTS region (
    region_id SERIAL PRIMARY KEY,
    region_name TEXT NOT NULL,
    total_esr_integrated INTEGER,
    fully_completed_esr INTEGER,
    partial_esr INTEGER,
    total_villages_integrated INTEGER,
    fully_completed_villages INTEGER,
    total_schemes_integrated INTEGER,
    fully_completed_schemes INTEGER,
    flow_meter_integrated INTEGER,
    rca_integrated INTEGER,
    pressure_transmitter_integrated INTEGER
);

-- 3. Scheme Status table - detailed tracking of water schemes
CREATE TABLE IF NOT EXISTS scheme_status (
    sr_no INTEGER,
    scheme_id TEXT NOT NULL,
    region TEXT,
    circle TEXT,
    division TEXT,
    sub_division TEXT,
    block TEXT,
    scheme_name TEXT NOT NULL,
    agency TEXT,
    number_of_village INTEGER,
    total_villages_integrated INTEGER,
    no_of_functional_village INTEGER,
    no_of_partial_village INTEGER,
    no_of_non_functional_village INTEGER,
    fully_completed_villages INTEGER,
    total_number_of_esr INTEGER,
    scheme_functional_status TEXT,
    total_esr_integrated INTEGER,
    no_fully_completed_esr INTEGER,
    balance_to_complete_esr INTEGER,
    flow_meters_connected INTEGER,
    pressure_transmitter_connected INTEGER,
    residual_chlorine_analyzer_connected INTEGER,
    fully_completion_scheme_status TEXT,
    mjp_commissioned TEXT,
    mjp_fully_completed TEXT,
    dashboard_url TEXT
);

-- 4. App State table for storing persistent application state
CREATE TABLE IF NOT EXISTS app_state (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Water Scheme Data table for LPCD tracking
CREATE TABLE IF NOT EXISTS water_scheme_data (
    region TEXT,
    circle TEXT,
    division TEXT,
    sub_division TEXT,
    block TEXT,
    scheme_id VARCHAR(100),
    scheme_name TEXT,
    village_name TEXT,
    population INTEGER,
    number_of_esr INTEGER,
    water_value_day1 DECIMAL(20,6),
    water_value_day2 DECIMAL(20,6),
    water_value_day3 DECIMAL(20,6),
    water_value_day4 DECIMAL(20,6),
    water_value_day5 DECIMAL(20,6),
    water_value_day6 DECIMAL(20,6),
    water_value_day7 DECIMAL(20,6),
    lpcd_value_day1 DECIMAL(20,6),
    lpcd_value_day2 DECIMAL(20,6),
    lpcd_value_day3 DECIMAL(20,6),
    lpcd_value_day4 DECIMAL(20,6),
    lpcd_value_day5 DECIMAL(20,6),
    lpcd_value_day6 DECIMAL(20,6),
    lpcd_value_day7 DECIMAL(20,6),
    water_date_day1 VARCHAR(20),
    water_date_day2 VARCHAR(20),
    water_date_day3 VARCHAR(20),
    water_date_day4 VARCHAR(20),
    water_date_day5 VARCHAR(20),
    water_date_day6 VARCHAR(20),
    water_date_day7 VARCHAR(20),
    lpcd_date_day1 VARCHAR(20),
    lpcd_date_day2 VARCHAR(20),
    lpcd_date_day3 VARCHAR(20),
    lpcd_date_day4 VARCHAR(20),
    lpcd_date_day5 VARCHAR(20),
    lpcd_date_day6 VARCHAR(20),
    lpcd_date_day7 VARCHAR(20),
    consistent_zero_lpcd_for_a_week INTEGER,
    below_55_lpcd_count INTEGER,
    above_55_lpcd_count INTEGER,
    dashboard_url TEXT,
    PRIMARY KEY (scheme_id, village_name)
);

-- 6. Water Scheme Data History table for permanent historical storage
CREATE TABLE IF NOT EXISTS water_scheme_data_history (
    id SERIAL PRIMARY KEY,
    region VARCHAR(100),
    circle VARCHAR(100),
    division VARCHAR(100),
    sub_division VARCHAR(100),
    block VARCHAR(100),
    scheme_id VARCHAR(100),
    scheme_name VARCHAR(255),
    village_name VARCHAR(255),
    population INTEGER,
    number_of_esr INTEGER,
    data_date VARCHAR(15) NOT NULL,
    water_value DECIMAL(20,6),
    lpcd_value DECIMAL(20,6),
    uploaded_at TIMESTAMP DEFAULT NOW() NOT NULL,
    upload_batch_id VARCHAR(50),
    dashboard_url TEXT,
    UNIQUE(scheme_id, village_name, data_date, uploaded_at)
);

-- 7. Chlorine Data table for ESR-level chlorine monitoring
CREATE TABLE IF NOT EXISTS chlorine_data (
    region VARCHAR(100),
    circle VARCHAR(100),
    division VARCHAR(100),
    sub_division VARCHAR(100),
    block VARCHAR(100),
    scheme_id VARCHAR(100),
    scheme_name VARCHAR(255),
    village_name VARCHAR(255),
    esr_name VARCHAR(255),
    chlorine_value_1 DECIMAL,
    chlorine_value_2 DECIMAL,
    chlorine_value_3 DECIMAL,
    chlorine_value_4 DECIMAL,
    chlorine_value_5 DECIMAL,
    chlorine_value_6 DECIMAL,
    chlorine_value_7 DECIMAL,
    chlorine_date_day_1 VARCHAR(15),
    chlorine_date_day_2 VARCHAR(15),
    chlorine_date_day_3 VARCHAR(15),
    chlorine_date_day_4 VARCHAR(15),
    chlorine_date_day_5 VARCHAR(15),
    chlorine_date_day_6 VARCHAR(15),
    chlorine_date_day_7 VARCHAR(15),
    number_of_consistent_zero_value_in_chlorine INTEGER,
    chlorine_less_than_02_mgl DECIMAL,
    chlorine_between_02_05_mgl DECIMAL,
    chlorine_greater_than_05_mgl DECIMAL,
    dashboard_url TEXT,
    PRIMARY KEY (scheme_id, village_name, esr_name)
);

-- 8. ESR Monitoring table for real-time infrastructure status
CREATE TABLE IF NOT EXISTS esr_monitoring (
    id SERIAL PRIMARY KEY,
    region_name VARCHAR(100),
    circle VARCHAR(100),
    division VARCHAR(100),
    sub_division VARCHAR(100),
    block VARCHAR(100),
    scheme_id VARCHAR(100),
    scheme_name VARCHAR(255),
    village_name VARCHAR(255),
    esr_name VARCHAR(255),
    chlorine_connected INTEGER DEFAULT 0,
    pressure_connected INTEGER DEFAULT 0,
    flow_meter_connected INTEGER DEFAULT 0,
    chlorine_status VARCHAR(50),
    pressure_status VARCHAR(50),
    flow_meter_status VARCHAR(50),
    overall_status VARCHAR(50),
    last_updated TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(scheme_id, village_name, esr_name)
);

-- 9. Communication Status table for tracking communication infrastructure
CREATE TABLE IF NOT EXISTS communication_status (
    id SERIAL PRIMARY KEY,
    region VARCHAR(100),
    circle VARCHAR(100),
    division VARCHAR(100),
    sub_division VARCHAR(100),
    block VARCHAR(100),
    scheme_id VARCHAR(100),
    scheme_name VARCHAR(255),
    village_name VARCHAR(255),
    esr_name VARCHAR(255),
    chlorine_connected VARCHAR(10),
    pressure_connected VARCHAR(10),
    flow_meter_connected VARCHAR(10),
    chlorine_status VARCHAR(20),
    pressure_status VARCHAR(20),
    flow_meter_status VARCHAR(20),
    overall_status VARCHAR(20),
    chlorine_0h_72h VARCHAR(20),
    chlorine_72h VARCHAR(20),
    pressure_0h_72h VARCHAR(20),
    pressure_72h VARCHAR(20),
    flow_meter_0h_72h VARCHAR(20),
    flow_meter_72h VARCHAR(20),
    uploaded_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(scheme_id, village_name, esr_name)
);

-- 10. Chlorine History table for permanent historical storage
CREATE TABLE IF NOT EXISTS chlorine_history (
    id SERIAL PRIMARY KEY,
    region VARCHAR(100),
    circle VARCHAR(100),
    division VARCHAR(100),
    sub_division VARCHAR(100),
    block VARCHAR(100),
    scheme_id VARCHAR(100),
    scheme_name VARCHAR(255),
    village_name VARCHAR(255),
    esr_name VARCHAR(255),
    chlorine_date VARCHAR(15) NOT NULL,
    chlorine_value DECIMAL,
    uploaded_at TIMESTAMP DEFAULT NOW() NOT NULL,
    upload_batch_id VARCHAR(50),
    dashboard_url TEXT,
    UNIQUE(scheme_id, village_name, esr_name, chlorine_date, uploaded_at)
);

-- 11. Pressure Data table for ESR-level pressure monitoring
CREATE TABLE IF NOT EXISTS pressure_data (
    region TEXT,
    circle TEXT,
    division TEXT,
    sub_division TEXT,
    block TEXT,
    scheme_id TEXT,
    scheme_name TEXT,
    village_name TEXT,
    esr_name TEXT,
    pressure_value_1 DECIMAL(12,2),
    pressure_value_2 DECIMAL(12,2),
    pressure_value_3 DECIMAL(12,2),
    pressure_value_4 DECIMAL(12,2),
    pressure_value_5 DECIMAL(12,2),
    pressure_value_6 DECIMAL(12,2),
    pressure_value_7 DECIMAL(12,2),
    pressure_date_day_1 VARCHAR(15),
    pressure_date_day_2 VARCHAR(15),
    pressure_date_day_3 VARCHAR(15),
    pressure_date_day_4 VARCHAR(15),
    pressure_date_day_5 VARCHAR(15),
    pressure_date_day_6 VARCHAR(15),
    pressure_date_day_7 VARCHAR(15),
    number_of_consistent_zero_value_in_pressure INTEGER,
    pressure_less_than_02_bar DECIMAL(12,2),
    pressure_between_02_07_bar DECIMAL(12,2),
    pressure_greater_than_07_bar DECIMAL(12,2),
    dashboard_url TEXT,
    PRIMARY KEY (scheme_id, village_name, esr_name)
);

-- 12. Pressure History table for permanent historical storage
CREATE TABLE IF NOT EXISTS pressure_history (
    id SERIAL PRIMARY KEY,
    region VARCHAR(100),
    circle VARCHAR(100),
    division VARCHAR(100),
    sub_division VARCHAR(100),
    block VARCHAR(100),
    scheme_id VARCHAR(100),
    scheme_name VARCHAR(255),
    village_name VARCHAR(255),
    esr_name VARCHAR(255),
    pressure_date VARCHAR(15) NOT NULL,
    pressure_value DECIMAL(12,2),
    uploaded_at TIMESTAMP DEFAULT NOW() NOT NULL,
    upload_batch_id VARCHAR(50),
    dashboard_url TEXT,
    UNIQUE(scheme_id, village_name, esr_name, pressure_date, uploaded_at)
);

-- 13. Population Tracking table for historical population data
CREATE TABLE IF NOT EXISTS population_tracking (
    id SERIAL PRIMARY KEY,
    region VARCHAR(100),
    total_population INTEGER,
    date_recorded DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(region, date_recorded)
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
-- ================================
-- Default Admin User Insert
-- ================================
INSERT INTO users (username, password, name, role) 
VALUES ('admin', 'admin123', 'Administrator', 'admin') 
ON CONFLICT (username) DO NOTHING;

-- ================================
-- Indexes for Performance Optimization
-- ================================

-- Indexes for water_scheme_data table
CREATE INDEX IF NOT EXISTS idx_water_scheme_region ON water_scheme_data(region);
CREATE INDEX IF NOT EXISTS idx_water_scheme_block ON water_scheme_data(block);

-- Indexes for chlorine_data table
CREATE INDEX IF NOT EXISTS idx_chlorine_region ON chlorine_data(region);
CREATE INDEX IF NOT EXISTS idx_chlorine_block ON chlorine_data(block);

-- Indexes for pressure_data table
CREATE INDEX IF NOT EXISTS idx_pressure_region ON pressure_data(region);
CREATE INDEX IF NOT EXISTS idx_pressure_block ON pressure_data(block);

-- Indexes for communication_status table
CREATE INDEX IF NOT EXISTS idx_comm_status_region ON communication_status(region);
CREATE INDEX IF NOT EXISTS idx_comm_status_block ON communication_status(block);

-- Indexes for historical tables
CREATE INDEX IF NOT EXISTS idx_water_history_date ON water_scheme_data_history(data_date);
CREATE INDEX IF NOT EXISTS idx_chlorine_history_date ON chlorine_history(chlorine_date);
CREATE INDEX IF NOT EXISTS idx_pressure_history_date ON pressure_history(pressure_date);
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


-- ================================
-- Notes:
-- ================================
-- 1. All tables support the Maharashtra water infrastructure monitoring system
-- 2. Primary keys are composite where multiple records per entity are expected
-- 3. Historical tables maintain permanent records with upload tracking
-- 4. Unique constraints prevent duplicate data entries
-- 5. Default admin user: username='admin', password='admin123'
-- 6. All timestamp fields use automatic NOW() defaults
-- 7. Decimal fields use appropriate precision for water measurement data
-- ================================