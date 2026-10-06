-- ==============================================================================
-- Cloud Database Migration Script
-- Run this script in your Cloud PostgreSQL database (pgAdmin / DBeaver / psql)
-- It safely adds all missing columns and tables without affecting existing data.
-- ==============================================================================

-- 1. email_alert_logs
ALTER TABLE email_alert_logs 
  ADD COLUMN IF NOT EXISTS dispatch_type VARCHAR(50) DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS telemetry_date VARCHAR(50),
  ADD COLUMN IF NOT EXISTS ticket_id VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_email_alert_logs_ticket_id ON email_alert_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_email_alert_logs_dispatch_type ON email_alert_logs(dispatch_type);

-- 2. sms_alert_logs
ALTER TABLE sms_alert_logs 
  ADD COLUMN IF NOT EXISTS dispatch_type VARCHAR(50) DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS telemetry_date VARCHAR(50),
  ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS delivery_description TEXT,
  ADD COLUMN IF NOT EXISTS delivered_date VARCHAR(50),
  ADD COLUMN IF NOT EXISTS delivery_checked_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS gateway_response TEXT,
  ADD COLUMN IF NOT EXISTS scheme_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS scheme_name VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_sms_alert_logs_sent_date ON sms_alert_logs(sent_date);
CREATE INDEX IF NOT EXISTS idx_sms_alert_logs_mobile ON sms_alert_logs(mobile);
CREATE INDEX IF NOT EXISTS idx_sms_alert_logs_scheme_id ON sms_alert_logs(scheme_id);

-- 3. email_acknowledgements
ALTER TABLE email_acknowledgements 
  ADD COLUMN IF NOT EXISTS alert_id INTEGER,
  ADD COLUMN IF NOT EXISTS ticket_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS esr_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS is_ack BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_email_acknowledgements_token ON email_acknowledgements(token);
CREATE INDEX IF NOT EXISTS idx_email_acknowledgements_scheme ON email_acknowledgements(scheme_id, alert_type, sent_date);
CREATE INDEX IF NOT EXISTS idx_email_acknowledgements_alert_id ON email_acknowledgements(alert_id);
CREATE INDEX IF NOT EXISTS idx_email_acknowledgements_ticket_id ON email_acknowledgements(ticket_id);
CREATE INDEX IF NOT EXISTS idx_email_acknowledgements_engineer ON email_acknowledgements(engineer_email);

-- 4. realtime_acknowledgements (Table creation if not exists)
CREATE TABLE IF NOT EXISTS realtime_acknowledgements (
  id SERIAL PRIMARY KEY,
  token VARCHAR(128) NOT NULL UNIQUE,
  scheme_id VARCHAR(100),
  scheme_name VARCHAR(255),
  village_name VARCHAR(255),
  esr_name VARCHAR(255),
  alert_type VARCHAR(100) NOT NULL,
  alert_value VARCHAR(100),
  ticket_id VARCHAR(100),
  engineer_name VARCHAR(255),
  engineer_email VARCHAR(255),
  engineer_mobile VARCHAR(30),
  remarks TEXT,
  is_acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  sent_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_realtime_acknowledgements_scheme_id ON realtime_acknowledgements(scheme_id);
CREATE INDEX IF NOT EXISTS idx_realtime_acknowledgements_ticket_id ON realtime_acknowledgements(ticket_id);
CREATE INDEX IF NOT EXISTS idx_realtime_acknowledgements_engineer_email ON realtime_acknowledgements(engineer_email);
CREATE INDEX IF NOT EXISTS idx_realtime_acknowledgements_sent_date ON realtime_acknowledgements(sent_date);

-- 5. realtime_sensor_data (Table creation if not exists)
CREATE TABLE IF NOT EXISTS realtime_sensor_data (
  id SERIAL PRIMARY KEY,
  scheme_id VARCHAR(100),
  village_name VARCHAR(255),
  esr_name VARCHAR(255),
  chlorine_value DECIMAL,
  chlorine_timestamp TIMESTAMP WITH TIME ZONE,
  chlorine_comm_status VARCHAR(20),
  pressure_value DECIMAL,
  pressure_timestamp TIMESTAMP WITH TIME ZONE,
  pressure_comm_status VARCHAR(20),
  flow_rate_value DECIMAL,
  flow_rate_timestamp TIMESTAMP WITH TIME ZONE,
  flow_rate_comm_status VARCHAR(20),
  prev_chlorine_status VARCHAR(20),
  prev_chlorine_value DECIMAL,
  last_updated_values TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated_comm TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. offline_reminder_logs (Table creation if not exists)
CREATE TABLE IF NOT EXISTS offline_reminder_logs (
  id SERIAL PRIMARY KEY,
  alert_id INTEGER,
  ticket_id VARCHAR(100),
  scheme_id VARCHAR(100) NOT NULL,
  scheme_name VARCHAR(255),
  village_name VARCHAR(255),
  esr_name VARCHAR(255),
  region VARCHAR(100),
  offline_sensors VARCHAR(255),
  vendor_name VARCHAR(255),
  vendor_email VARCHAR(255) NOT NULL,
  sent_by_user_id INTEGER,
  sent_by_name VARCHAR(255),
  sent_by_email VARCHAR(255),
  copied_engineers TEXT,
  ee_civil_email VARCHAR(255),
  ee_mech_email VARCHAR(255),
  de_ae_civil_email VARCHAR(255),
  de_ae_mech_email VARCHAR(255),
  se_email VARCHAR(255),
  chief_engineer_email VARCHAR(255),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offline_reminder_logs_scheme ON offline_reminder_logs(scheme_id);
CREATE INDEX IF NOT EXISTS idx_offline_reminder_logs_ticket ON offline_reminder_logs(ticket_id);

-- 7. email_delivery_failures (Audit table for tracking failed emails)
CREATE TABLE IF NOT EXISTS email_delivery_failures (
  id SERIAL PRIMARY KEY,
  recipient_email VARCHAR(255) NOT NULL,
  engineer_name VARCHAR(255),
  scheme_id VARCHAR(100),
  scheme_name VARCHAR(255),
  alert_count INTEGER DEFAULT 1,
  alert_summary TEXT,
  error_message TEXT,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
