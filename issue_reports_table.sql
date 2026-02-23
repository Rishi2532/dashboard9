-- SQL Script to create the issue_reports table in pgAdmin
-- Run this script in the Query Tool for your database

CREATE TABLE IF NOT EXISTS public.issue_reports (
    id SERIAL PRIMARY KEY,
    problem_level TEXT NOT NULL,
    region TEXT NOT NULL,
    scheme_id TEXT NOT NULL,
    scheme_name TEXT NOT NULL,
    village_name TEXT,
    esr_name TEXT,
    status_value TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active',
    resolution_remark TEXT,
    resolved_at TIMESTAMPTZ,
    created_by INTEGER NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_issue_reports_status ON public.issue_reports(status);
CREATE INDEX IF NOT EXISTS idx_issue_reports_scheme ON public.issue_reports(scheme_id);
