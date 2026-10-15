-- SQL Script to create the email_alert_logs table

CREATE TABLE IF NOT EXISTS public.email_alert_logs (
    id SERIAL PRIMARY KEY,
    scheme_id VARCHAR(100) NOT NULL,
    scheme_name VARCHAR(255) NOT NULL,
    region VARCHAR(100),
    village_name VARCHAR(255),
    esr_name VARCHAR(255),
    alert_type VARCHAR(50) NOT NULL, -- e.g., 'LPCD', 'Chlorine', 'Pressure', 'Water'
    alert_value VARCHAR(100) NOT NULL, -- The failing value that triggered the alert
    
    -- Executive Engineers
    ee_civil_name VARCHAR(255),
    ee_civil_email VARCHAR(255),
    ee_mech_name VARCHAR(255),
    ee_mech_email VARCHAR(255),
    
    -- DE/AE
    de_ae_civil_name VARCHAR(255),
    de_ae_civil_email VARCHAR(255),
    de_ae_mech_name VARCHAR(255),
    de_ae_mech_email VARCHAR(255),
    
    -- Supervisory Leadership
    se_name VARCHAR(255),
    se_email VARCHAR(255),
    chief_engineer_name VARCHAR(255),
    chief_engineer_email VARCHAR(255),

    -- Secretarial Leadership
    member_secretary_name VARCHAR(255),
    member_secretary_email VARCHAR(255),
    principal_secretary_name VARCHAR(255),
    principal_secretary_email VARCHAR(255),

    -- Legacy columns
    civil_engineer_name VARCHAR(255),
    civil_engineer_email VARCHAR(255),
    mechanical_engineer_name VARCHAR(255),
    mechanical_engineer_email VARCHAR(255),
    site_supervisor_name VARCHAR(255),
    site_supervisor_email VARCHAR(255),
    
    sent_date DATE NOT NULL DEFAULT CURRENT_DATE,
    sent_time TIME WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIME,
    ticket_id VARCHAR(100) UNIQUE,
    dispatch_type VARCHAR(50) DEFAULT 'daily',
    telemetry_date VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- If the table already exists, CREATE TABLE IF NOT EXISTS will NOT add new columns.
-- The ALTER TABLE statements below ensure all columns exist on Cloud/Local:
-- ==============================================================================
ALTER TABLE public.email_alert_logs
    ADD COLUMN IF NOT EXISTS dispatch_type VARCHAR(50) DEFAULT 'daily',
    ADD COLUMN IF NOT EXISTS telemetry_date VARCHAR(50),
    ADD COLUMN IF NOT EXISTS ticket_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS member_secretary_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS member_secretary_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS principal_secretary_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS principal_secretary_email VARCHAR(255);

-- Indexes for faster querying
CREATE INDEX IF NOT EXISTS idx_email_alert_logs_scheme_id ON public.email_alert_logs(scheme_id);
CREATE INDEX IF NOT EXISTS idx_email_alert_logs_sent_date ON public.email_alert_logs(sent_date);
CREATE INDEX IF NOT EXISTS idx_email_alert_logs_alert_type ON public.email_alert_logs(alert_type);
CREATE INDEX IF NOT EXISTS idx_email_alert_logs_dispatch_type ON public.email_alert_logs(dispatch_type);
CREATE INDEX IF NOT EXISTS idx_email_alert_logs_ticket_id ON public.email_alert_logs(ticket_id);
