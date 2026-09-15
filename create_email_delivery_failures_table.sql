-- Table: email_delivery_failures
-- Purpose: Private audit table to track failed alert email deliveries with error details

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

CREATE INDEX IF NOT EXISTS idx_email_delivery_failures_email ON email_delivery_failures(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_delivery_failures_date ON email_delivery_failures(attempted_at);
