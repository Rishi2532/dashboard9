-- pgAdmin SQL Script to recreate all tables in the database
-- Use this script in the pgAdmin query tool

-- Drop tables if they exist (in reverse order to avoid foreign key constraints)
DROP TABLE IF EXISTS pressure_data;
DROP TABLE IF EXISTS chlorine_data;
DROP TABLE IF EXISTS water_scheme_data;
DROP TABLE IF EXISTS scheme_status;
DROP TABLE IF EXISTS global_summary;
DROP TABLE IF EXISTS region;
DROP TABLE IF EXISTS app_state;
DROP TABLE IF EXISTS users;

-- Create Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'user'
);

-- Create App State table
CREATE TABLE app_state (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create Region table
CREATE TABLE region (
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

-- Create Global Summary table
CREATE TABLE global_summary (
  id SERIAL PRIMARY KEY,
  total_schemes_integrated INTEGER,
  fully_completed_schemes INTEGER,
  total_villages_integrated INTEGER,
  fully_completed_villages INTEGER,
  total_esr_integrated INTEGER,
  fully_completed_esr INTEGER,
  flow_meter_integrated INTEGER,
  rca_integrated INTEGER,
  pressure_transmitter_integrated INTEGER
);

-- Create Scheme Status table
CREATE TABLE scheme_status (
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
  dashboard_url TEXT
);

-- Create Water Scheme Data table
CREATE TABLE water_scheme_data (
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
  water_value_day1 DECIMAL(20, 6),
  water_value_day2 DECIMAL(20, 6),
  water_value_day3 DECIMAL(20, 6),
  water_value_day4 DECIMAL(20, 6),
  water_value_day5 DECIMAL(20, 6),
  water_value_day6 DECIMAL(20, 6),
  lpcd_value_day1 DECIMAL(20, 6),
  lpcd_value_day2 DECIMAL(20, 6),
  lpcd_value_day3 DECIMAL(20, 6),
  lpcd_value_day4 DECIMAL(20, 6),
  lpcd_value_day5 DECIMAL(20, 6),
  lpcd_value_day6 DECIMAL(20, 6),
  lpcd_value_day7 DECIMAL(20, 6),
  water_date_day1 VARCHAR(20),
  water_date_day2 VARCHAR(20),
  water_date_day3 VARCHAR(20),
  water_date_day4 VARCHAR(20),
  water_date_day5 VARCHAR(20),
  water_date_day6 VARCHAR(20),
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
  PRIMARY KEY(scheme_id, village_name)
);

-- Create Chlorine Data table
CREATE TABLE chlorine_data (
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
  PRIMARY KEY(scheme_id, village_name, esr_name)
);

-- Create Pressure Data table
CREATE TABLE pressure_data (
  region TEXT,
  circle TEXT,
  division TEXT,
  sub_division TEXT,
  block TEXT,
  scheme_id TEXT,
  scheme_name TEXT,
  village_name TEXT,
  esr_name TEXT,
  pressure_value_1 DECIMAL(12, 2),
  pressure_value_2 DECIMAL(12, 2),
  pressure_value_3 DECIMAL(12, 2),
  pressure_value_4 DECIMAL(12, 2),
  pressure_value_5 DECIMAL(12, 2),
  pressure_value_6 DECIMAL(12, 2),
  pressure_value_7 DECIMAL(12, 2),
  pressure_date_day_1 VARCHAR(15),
  pressure_date_day_2 VARCHAR(15),
  pressure_date_day_3 VARCHAR(15),
  pressure_date_day_4 VARCHAR(15),
  pressure_date_day_5 VARCHAR(15),
  pressure_date_day_6 VARCHAR(15),
  pressure_date_day_7 VARCHAR(15),
  number_of_consistent_zero_value_in_pressure INTEGER,
  pressure_less_than_02_bar DECIMAL(12, 2),
  pressure_between_02_07_bar DECIMAL(12, 2),
  pressure_greater_than_07_bar DECIMAL(12, 2),
  PRIMARY KEY(scheme_id, village_name, esr_name)
);

-- Create individual table creation scripts for easier use

-- 1. Users Table
CREATE OR REPLACE FUNCTION create_users_table() RETURNS VOID AS $$
BEGIN
  DROP TABLE IF EXISTS users;
  
  CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT,
    role TEXT NOT NULL DEFAULT 'user'
  );
  
  -- Create a default admin user (customize the password as needed)
  INSERT INTO users (username, password, name, role) 
  VALUES ('admin', '$2b$10$OBQJlJUPFiYYVa6l8CUP3eJwgB3N/XiRqXWyvyqT.IzZxFDFKP5Qm', 'Administrator', 'admin');
  -- Note: this is a bcrypt hash of 'adminpassword', replace with your own secure password
  
  RAISE NOTICE 'Users table created with default admin user';
END;
$$ LANGUAGE plpgsql;

-- 2. Region Table
CREATE OR REPLACE FUNCTION create_region_table() RETURNS VOID AS $$
BEGIN
  DROP TABLE IF EXISTS region;
  
  CREATE TABLE region (
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
  
  RAISE NOTICE 'Region table created';
END;
$$ LANGUAGE plpgsql;

-- 3. Scheme Status Table
CREATE OR REPLACE FUNCTION create_scheme_status_table() RETURNS VOID AS $$
BEGIN
  DROP TABLE IF EXISTS scheme_status;
  
  CREATE TABLE scheme_status (
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
    dashboard_url TEXT
  );
  
  RAISE NOTICE 'Scheme Status table created';
END;
$$ LANGUAGE plpgsql;

-- 4. Water Scheme Data Table
CREATE OR REPLACE FUNCTION create_water_scheme_data_table() RETURNS VOID AS $$
BEGIN
  DROP TABLE IF EXISTS water_scheme_data;
  
  CREATE TABLE water_scheme_data (
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
    water_value_day1 DECIMAL(20, 6),
    water_value_day2 DECIMAL(20, 6),
    water_value_day3 DECIMAL(20, 6),
    water_value_day4 DECIMAL(20, 6),
    water_value_day5 DECIMAL(20, 6),
    water_value_day6 DECIMAL(20, 6),
    lpcd_value_day1 DECIMAL(20, 6),
    lpcd_value_day2 DECIMAL(20, 6),
    lpcd_value_day3 DECIMAL(20, 6),
    lpcd_value_day4 DECIMAL(20, 6),
    lpcd_value_day5 DECIMAL(20, 6),
    lpcd_value_day6 DECIMAL(20, 6),
    lpcd_value_day7 DECIMAL(20, 6),
    water_date_day1 VARCHAR(20),
    water_date_day2 VARCHAR(20),
    water_date_day3 VARCHAR(20),
    water_date_day4 VARCHAR(20),
    water_date_day5 VARCHAR(20),
    water_date_day6 VARCHAR(20),
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
    PRIMARY KEY(scheme_id, village_name)
  );
  
  RAISE NOTICE 'Water Scheme Data table created';
END;
$$ LANGUAGE plpgsql;

-- 5. Chlorine Data Table
CREATE OR REPLACE FUNCTION create_chlorine_data_table() RETURNS VOID AS $$
BEGIN
  DROP TABLE IF EXISTS chlorine_data;
  
  CREATE TABLE chlorine_data (
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
    PRIMARY KEY(scheme_id, village_name, esr_name)
  );
  
  RAISE NOTICE 'Chlorine Data table created';
END;
$$ LANGUAGE plpgsql;

-- 6. Pressure Data Table
CREATE OR REPLACE FUNCTION create_pressure_data_table() RETURNS VOID AS $$
BEGIN
  DROP TABLE IF EXISTS pressure_data;
  
  CREATE TABLE pressure_data (
    region TEXT,
    circle TEXT,
    division TEXT,
    sub_division TEXT,
    block TEXT,
    scheme_id TEXT,
    scheme_name TEXT,
    village_name TEXT,
    esr_name TEXT,
    pressure_value_1 DECIMAL(12, 2),
    pressure_value_2 DECIMAL(12, 2),
    pressure_value_3 DECIMAL(12, 2),
    pressure_value_4 DECIMAL(12, 2),
    pressure_value_5 DECIMAL(12, 2),
    pressure_value_6 DECIMAL(12, 2),
    pressure_value_7 DECIMAL(12, 2),
    pressure_date_day_1 VARCHAR(15),
    pressure_date_day_2 VARCHAR(15),
    pressure_date_day_3 VARCHAR(15),
    pressure_date_day_4 VARCHAR(15),
    pressure_date_day_5 VARCHAR(15),
    pressure_date_day_6 VARCHAR(15),
    pressure_date_day_7 VARCHAR(15),
    number_of_consistent_zero_value_in_pressure INTEGER,
    pressure_less_than_02_bar DECIMAL(12, 2),
    pressure_between_02_07_bar DECIMAL(12, 2),
    pressure_greater_than_07_bar DECIMAL(12, 2),
    PRIMARY KEY(scheme_id, village_name, esr_name)
  );
  
  RAISE NOTICE 'Pressure Data table created';
END;
$$ LANGUAGE plpgsql;

-- 7. Global Summary Table
CREATE OR REPLACE FUNCTION create_global_summary_table() RETURNS VOID AS $$
BEGIN
  DROP TABLE IF EXISTS global_summary;
  
  CREATE TABLE global_summary (
    id SERIAL PRIMARY KEY,
    total_schemes_integrated INTEGER,
    fully_completed_schemes INTEGER,
    total_villages_integrated INTEGER,
    fully_completed_villages INTEGER,
    total_esr_integrated INTEGER,
    fully_completed_esr INTEGER,
    flow_meter_integrated INTEGER,
    rca_integrated INTEGER,
    pressure_transmitter_integrated INTEGER
  );
  
  -- Initialize with a single row
  INSERT INTO global_summary (id, total_schemes_integrated, fully_completed_schemes,
    total_villages_integrated, fully_completed_villages, total_esr_integrated, 
    fully_completed_esr, flow_meter_integrated, rca_integrated, 
    pressure_transmitter_integrated)
  VALUES (1, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  
  RAISE NOTICE 'Global Summary table created with initial row';
END;
$$ LANGUAGE plpgsql;

-- 8. App State Table 
CREATE OR REPLACE FUNCTION create_app_state_table() RETURNS VOID AS $$
BEGIN
  DROP TABLE IF EXISTS app_state;
  
  CREATE TABLE app_state (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
  );
  
  RAISE NOTICE 'App State table created';
END;
$$ LANGUAGE plpgsql;

-- Function to create all tables
CREATE OR REPLACE FUNCTION create_all_tables() RETURNS VOID AS $$
BEGIN
  PERFORM create_users_table();
  PERFORM create_app_state_table();
  PERFORM create_region_table();
  PERFORM create_global_summary_table();
  PERFORM create_scheme_status_table();
  PERFORM create_water_scheme_data_table();
  PERFORM create_chlorine_data_table();
  PERFORM create_pressure_data_table();
  
  RAISE NOTICE 'All tables created successfully';
END;
$$ LANGUAGE plpgsql;

-- To create all tables at once, run:
-- SELECT create_all_tables();

-- To create individual tables, run any of:
-- SELECT create_users_table();
-- SELECT create_app_state_table();
-- SELECT create_region_table();
-- SELECT create_global_summary_table();
-- SELECT create_scheme_status_table();
-- SELECT create_water_scheme_data_table();
-- SELECT create_chlorine_data_table();
-- SELECT create_pressure_data_table();
