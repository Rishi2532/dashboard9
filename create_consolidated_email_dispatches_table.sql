-- ==============================================================================
-- Script: create_consolidated_email_dispatches_table.sql
-- Description: DDL script for consolidated_email_dispatches (and consolidated_emails view)
-- Tracks consolidated alert emails sent to officers across all escalation tiers
-- ==============================================================================

CREATE TABLE IF NOT EXISTS consolidated_email_dispatches (
    id SERIAL PRIMARY KEY,
    dispatch_date DATE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date,
    sent_time VARCHAR(20),
    engineer_name VARCHAR(255) NOT NULL,
    engineer_email VARCHAR(255) NOT NULL,
    engineer_role VARCHAR(100) DEFAULT 'DE/AE (Civil)',
    engineer_mobile VARCHAR(30),
    total_schemes INTEGER NOT NULL DEFAULT 1,
    scheme_ids JSONB DEFAULT '[]'::jsonb,
    scheme_names JSONB DEFAULT '[]'::jsonb,
    total_alerts INTEGER NOT NULL DEFAULT 1,
    lpcd_alerts_count INTEGER DEFAULT 0,
    chlorine_alerts_count INTEGER DEFAULT 0,
    pressure_alerts_count INTEGER DEFAULT 0,
    offline_alerts_count INTEGER DEFAULT 0,
    master_token VARCHAR(128),
    subject VARCHAR(255) DEFAULT '🚨 Critical Water Scheme Alerts - Action Required',
    status VARCHAR(50) DEFAULT 'SENT',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_consolidated_email_dispatches_date ON consolidated_email_dispatches(dispatch_date);
CREATE INDEX IF NOT EXISTS idx_consolidated_email_dispatches_email ON consolidated_email_dispatches(engineer_email);
CREATE INDEX IF NOT EXISTS idx_consolidated_email_dispatches_role ON consolidated_email_dispatches(engineer_role);
CREATE INDEX IF NOT EXISTS idx_consolidated_email_dispatches_status ON consolidated_email_dispatches(status);

-- Convenient view alias: consolidated_emails -> consolidated_email_dispatches
CREATE OR REPLACE VIEW consolidated_emails AS
SELECT * FROM consolidated_email_dispatches;

-- Table and column documentation
COMMENT ON TABLE consolidated_email_dispatches IS 'Audit log of consolidated daily alert emails dispatched to designated field & supervisory engineers';
COMMENT ON COLUMN consolidated_email_dispatches.dispatch_date IS 'Date of dispatch in Asia/Kolkata timezone (IST)';
COMMENT ON COLUMN consolidated_email_dispatches.engineer_role IS 'Designation: DE/AE (Civil), Executive Engineer (Civil), Superintending Engineer (SE), Chief Engineer (CE), Member Secretary (MS), Principal Secretary (PS)';
COMMENT ON COLUMN consolidated_email_dispatches.total_alerts IS 'Number of alert issues consolidated within this single dispatched email';
COMMENT ON COLUMN consolidated_email_dispatches.master_token IS 'Security token for bulk one-click acknowledgement';
