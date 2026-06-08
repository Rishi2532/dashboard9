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
    civil_engineer_name VARCHAR(255),
    civil_engineer_email VARCHAR(255),
    mechanical_engineer_name VARCHAR(255),
    mechanical_engineer_email VARCHAR(255),
    site_supervisor_name VARCHAR(255),
    site_supervisor_email VARCHAR(255),
    sent_date DATE NOT NULL DEFAULT CURRENT_DATE,
    sent_time TIME NOT NULL DEFAULT CURRENT_TIME,
    ticket_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for faster querying by the Alerts Progress Page
CREATE INDEX IF NOT EXISTS idx_email_alert_logs_scheme_id ON public.email_alert_logs(scheme_id);
CREATE INDEX IF NOT EXISTS idx_email_alert_logs_sent_date ON public.email_alert_logs(sent_date);
CREATE INDEX IF NOT EXISTS idx_email_alert_logs_alert_type ON public.email_alert_logs(alert_type);
