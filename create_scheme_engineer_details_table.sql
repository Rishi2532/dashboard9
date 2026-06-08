-- SQL Script to create the scheme_engineer_details table

CREATE TABLE IF NOT EXISTS public.scheme_engineer_details (
    id SERIAL PRIMARY KEY,
    region VARCHAR(100),
    district VARCHAR(100),
    division VARCHAR(100),
    scheme_id VARCHAR(100),
    scheme VARCHAR(255),
    civil_engineer_name VARCHAR(255),
    civil_engineer_mobile VARCHAR(20),
    civil_engineer_email VARCHAR(255),
    mechanical_engineer_name VARCHAR(255),
    mechanical_engineer_mobile VARCHAR(20),
    mechanical_engineer_email VARCHAR(255),
    site_supervisor_name VARCHAR(255),
    site_supervisor_mobile VARCHAR(20),
    site_supervisor_email VARCHAR(255)
);

-- Index for faster joins by scheme_id on Alerts Progress queries
CREATE INDEX IF NOT EXISTS idx_scheme_engineer_details_scheme_id ON public.scheme_engineer_details(scheme_id);
