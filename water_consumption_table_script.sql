-- CREATE TABLE script for water_consumption
-- Based on the schema definition from shared/schema.ts

CREATE TABLE water_consumption (
    -- Location information
    region VARCHAR(100),
    circle VARCHAR(100),
    division VARCHAR(100),
    sub_division VARCHAR(100),
    block VARCHAR(100),
    
    -- Identification
    scheme_id VARCHAR(50),
    scheme_name VARCHAR(255),
    village_name VARCHAR(255),
    esr_name VARCHAR(255),
    
    -- Flow metrics
    flow_rate_m3 DECIMAL,
    flow_meter_connected VARCHAR(50),
    online_status VARCHAR(20),
    time_duration VARCHAR(50),
    esr_capacity DECIMAL,
    
    -- Water consumption values for 7 days
    water_value_day1 DECIMAL,
    water_value_day2 DECIMAL,
    water_value_day3 DECIMAL,
    water_value_day4 DECIMAL,
    water_value_day5 DECIMAL,
    water_value_day6 DECIMAL,
    water_value_day7 DECIMAL,
    
    -- Water consumption dates for 7 days
    water_date_day1 VARCHAR(15),
    water_date_day2 VARCHAR(15),
    water_date_day3 VARCHAR(15),
    water_date_day4 VARCHAR(15),
    water_date_day5 VARCHAR(15),
    water_date_day6 VARCHAR(15),
    water_date_day7 VARCHAR(15),
    
    -- Analysis metrics
    consistent_zero_consumption INTEGER,
    percentage_consumption_previous_day DECIMAL,
    
    -- Dashboard URL
    dashboard_url TEXT,
    
    -- Primary key constraint
    PRIMARY KEY (scheme_id, village_name, esr_name)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_water_consumption_region ON water_consumption(region);
CREATE INDEX IF NOT EXISTS idx_water_consumption_scheme_id ON water_consumption(scheme_id);
CREATE INDEX IF NOT EXISTS idx_water_consumption_village ON water_consumption(village_name);
CREATE INDEX IF NOT EXISTS idx_water_consumption_location ON water_consumption(region, circle, division, sub_division, block);

-- Comments for table documentation
COMMENT ON TABLE water_consumption IS 'Table for tracking water consumption data across different ESRs and villages';
COMMENT ON COLUMN water_consumption.scheme_id IS 'Unique identifier for the water scheme';
COMMENT ON COLUMN water_consumption.village_name IS 'Name of the village where the ESR is located';
COMMENT ON COLUMN water_consumption.esr_name IS 'Name of the Elevated Storage Reservoir';
COMMENT ON COLUMN water_consumption.water_value_day1 IS 'Water consumption value for day 1 (most recent)';
COMMENT ON COLUMN water_consumption.water_value_day7 IS 'Water consumption value for day 7 (oldest)';
COMMENT ON COLUMN water_consumption.flow_meter_connected IS 'Flow meter connection status';
COMMENT ON COLUMN water_consumption.online_status IS 'Online status of the sensor';
COMMENT ON COLUMN water_consumption.time_duration IS 'Time duration of water consumption measurement';
COMMENT ON COLUMN water_consumption.consistent_zero_consumption IS 'Number of days with consistent zero consumption';
COMMENT ON COLUMN water_consumption.dashboard_url IS 'URL to access the PI Vision dashboard for this ESR';