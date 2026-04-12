-- Database Schema Creation Script
-- Generated from shared/schema.ts

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'user'
);

-- 2. Region table
CREATE TABLE IF NOT EXISTS region (
  region_id SERIAL PRIMARY KEY,
  region_name TEXT NOT NULL UNIQUE,
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

-- 3. Scheme Status table
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
  water_supply TEXT,
  agency_type TEXT,
  water_supply_status TEXT,
  dashboard_url TEXT,
  UNIQUE(scheme_id, block)
);

-- 4. App State table
CREATE TABLE IF NOT EXISTS app_state (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Helpdesk Tickets table
CREATE TABLE IF NOT EXISTS helpdesk_tickets (
  id SERIAL PRIMARY KEY,
  ticket_id VARCHAR(20) NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  specific_issue TEXT NOT NULL,
  description TEXT NOT NULL,
  level TEXT NOT NULL,
  region TEXT,
  circle TEXT,
  division TEXT,
  subdivision TEXT,
  block TEXT,
  scheme_id TEXT,
  scheme_name TEXT,
  village_name TEXT,
  esr_name TEXT,
  priority TEXT NOT NULL DEFAULT 'Medium',
  status TEXT NOT NULL DEFAULT 'Open',
  contact_name TEXT NOT NULL,
  contact_phone TEXT,
  contact_email TEXT NOT NULL,
  dashboard_url TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  attachment_path TEXT,
  attachment_filename TEXT,
  admin_comments TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 6. Helpdesk Attachments table
CREATE TABLE IF NOT EXISTS helpdesk_attachments (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES helpdesk_tickets(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  stored_filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 7. Water Scheme Data table
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
  water_value_day1 DECIMAL,
  water_value_day2 DECIMAL,
  water_value_day3 DECIMAL,
  water_value_day4 DECIMAL,
  water_value_day5 DECIMAL,
  water_value_day6 DECIMAL,
  water_value_day7 DECIMAL,
  lpcd_value_day1 DECIMAL,
  lpcd_value_day2 DECIMAL,
  lpcd_value_day3 DECIMAL,
  lpcd_value_day4 DECIMAL,
  lpcd_value_day5 DECIMAL,
  lpcd_value_day6 DECIMAL,
  lpcd_value_day7 DECIMAL,
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
  PRIMARY KEY (scheme_id, village_name, block)
);

-- 8. Water Scheme Data History table
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
  water_value DECIMAL,
  lpcd_value DECIMAL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  upload_batch_id VARCHAR(50),
  dashboard_url TEXT,
  UNIQUE(scheme_id, village_name, block, data_date, uploaded_at)
);

-- 9. Scheme LPCD Data History table
CREATE TABLE IF NOT EXISTS scheme_lpcd_data_history (
  id SERIAL PRIMARY KEY,
  region VARCHAR(100),
  circle VARCHAR(100),
  division VARCHAR(100),
  sub_division VARCHAR(100),
  block VARCHAR(100),
  scheme_id VARCHAR(100),
  scheme_name VARCHAR(255),
  total_population INTEGER,
  total_villages INTEGER,
  villages_below_55 INTEGER,
  villages_above_55 INTEGER,
  villages_zero_supply INTEGER,
  data_date VARCHAR(15) NOT NULL,
  water_value DECIMAL,
  lpcd_value DECIMAL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  upload_batch_id VARCHAR(50),
  dashboard_url TEXT,
  mjp_commissioned TEXT,
  UNIQUE(scheme_id, block, data_date)
);

-- 10. Chlorine Data table
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

-- 11. ESR Monitoring table
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
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(scheme_id, village_name, esr_name)
);

-- 12. Communication Status table
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
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  pressure_last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(scheme_id, village_name, esr_name)
);

-- 13. Chlorine History table
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
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  upload_batch_id VARCHAR(50),
  dashboard_url TEXT,
  UNIQUE(scheme_id, village_name, esr_name, chlorine_date, uploaded_at)
);

-- 14. Pressure Data table
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

-- 15. Pressure History table
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
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  upload_batch_id VARCHAR(50),
  dashboard_url TEXT,
  UNIQUE(scheme_id, village_name, esr_name, pressure_date, uploaded_at)
);

-- 16. Water Consumption table
CREATE TABLE IF NOT EXISTS water_consumption (
  region VARCHAR(100),
  circle VARCHAR(100),
  division VARCHAR(100),
  sub_division VARCHAR(100),
  block VARCHAR(100),
  scheme_id VARCHAR(50),
  scheme_name VARCHAR(255),
  village_name VARCHAR(255),
  esr_name VARCHAR(255),
  flow_rate_m3 DECIMAL,
  flow_meter_connected VARCHAR(50),
  online_status VARCHAR(20),
  time_duration VARCHAR(50),
  esr_capacity DECIMAL,
  water_value_day1 DECIMAL,
  water_value_day2 DECIMAL,
  water_value_day3 DECIMAL,
  water_value_day4 DECIMAL,
  water_value_day5 DECIMAL,
  water_value_day6 DECIMAL,
  water_value_day7 DECIMAL,
  water_date_day1 VARCHAR(15),
  water_date_day2 VARCHAR(15),
  water_date_day3 VARCHAR(15),
  water_date_day4 VARCHAR(15),
  water_date_day5 VARCHAR(15),
  water_date_day6 VARCHAR(15),
  water_date_day7 VARCHAR(15),
  consistent_zero_consumption INTEGER,
  percentage_consumption_previous_day DECIMAL,
  dashboard_url TEXT,
  PRIMARY KEY (scheme_id, village_name, esr_name)
);

-- 17. Water Consumption History table
CREATE TABLE IF NOT EXISTS water_consumption_history (
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
  data_date VARCHAR(15) NOT NULL,
  water_value DECIMAL,
  flow_rate_m3 DECIMAL,
  esr_capacity DECIMAL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  upload_batch_id VARCHAR(50),
  dashboard_url TEXT,
  UNIQUE(scheme_id, village_name, esr_name, data_date, uploaded_at)
);

-- 18. Report Files table
CREATE TABLE IF NOT EXISTS report_files (
  id SERIAL PRIMARY KEY,
  file_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  report_type TEXT NOT NULL,
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  uploaded_by INTEGER REFERENCES users(id),
  file_size INTEGER,
  is_active BOOLEAN DEFAULT TRUE
);

-- 19. User Login Logs table
CREATE TABLE IF NOT EXISTS user_login_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  username TEXT NOT NULL,
  user_name TEXT,
  login_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  logout_time TIMESTAMP WITH TIME ZONE,
  session_duration INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

-- 20. User Activity Logs table
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  username TEXT NOT NULL,
  session_id TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  activity_description TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT,
  page_url TEXT,
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  metadata JSONB
);

-- 21. Population Tracking table
CREATE TABLE IF NOT EXISTS population_tracking (
  id SERIAL PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  total_population INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 22. Region Population Tracking table
CREATE TABLE IF NOT EXISTS region_population_tracking (
  id SERIAL PRIMARY KEY,
  date TEXT NOT NULL,
  region TEXT NOT NULL,
  total_population INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE(date, region)
);

-- 23. Village table
CREATE TABLE IF NOT EXISTS village (
  region VARCHAR(100),
  circle VARCHAR(100),
  division VARCHAR(100),
  sub_division VARCHAR(100),
  block VARCHAR(100),
  scheme_id VARCHAR(50),
  scheme_name VARCHAR(255),
  village_name VARCHAR(255),
  number_of_esr INTEGER,
  connected_esr INTEGER,
  not_connected_esr INTEGER,
  village_functional_status VARCHAR(50),
  no_of_fully_completion_esr INTEGER,
  fully_completion_village_status VARCHAR(50)
);

-- 24. MQTT Topics Last Seen table
CREATE TABLE IF NOT EXISTS topics_last_seen (
  topic_id TEXT PRIMARY KEY,
  last_value TEXT,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  broker_server TEXT
);

-- 25. MQTT Topic Configuration table
CREATE TABLE IF NOT EXISTS mqtt_topic_configurations (
  id SERIAL PRIMARY KEY,
  sr_no INTEGER,
  server TEXT,
  region TEXT,
  circle TEXT,
  division TEXT,
  sub_division TEXT,
  block TEXT,
  scheme_id_name TEXT,
  vendor TEXT,
  village TEXT,
  reservoir TEXT,
  message_type TEXT,
  topic_for_flow_meter TEXT,
  topic_for_cl TEXT,
  type_of_cl TEXT,
  topic_for_pressure TEXT,
  received_date TEXT,
  date_of_integration TEXT
);

-- 26. Vendor table
CREATE TABLE IF NOT EXISTS vendor (
  id SERIAL PRIMARY KEY,
  region TEXT NOT NULL,
  agency TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone VARCHAR(15) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(region, email)
);

-- 27. Issue Reports table
CREATE TABLE IF NOT EXISTS issue_reports (
  id SERIAL PRIMARY KEY,
  problem_level TEXT NOT NULL,
  region TEXT NOT NULL,
  scheme_id TEXT NOT NULL,
  scheme_name TEXT NOT NULL,
  village_name TEXT,
  esr_name TEXT,
  status_value TEXT NOT NULL,
  reason TEXT NOT NULL,
  sensor_type TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  resolution_remark TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_by INTEGER NOT NULL REFERENCES users(id),
  creator_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);