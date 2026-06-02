-- Create email_acknowledgements table for tracking engineer acknowledgements
CREATE TABLE IF NOT EXISTS email_acknowledgements (
  id SERIAL PRIMARY KEY,
  token VARCHAR(128) NOT NULL UNIQUE,
  scheme_id VARCHAR(50) NOT NULL,
  alert_type VARCHAR(20) NOT NULL, -- 'LPCD', 'Chlorine', 'Pressure'
  engineer_email VARCHAR(255) NOT NULL,
  engineer_name VARCHAR(255),
  sent_date DATE NOT NULL DEFAULT CURRENT_DATE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast token lookups (used on acknowledge link click)
CREATE INDEX IF NOT EXISTS idx_email_acknowledgements_token ON email_acknowledgements(token);
-- Index for dashboard queries (joining by scheme + type + date)
CREATE INDEX IF NOT EXISTS idx_email_acknowledgements_scheme ON email_acknowledgements(scheme_id, alert_type, sent_date);
