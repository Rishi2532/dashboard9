-- SQL Script to create the scheme_engineer_details table
-- Hierarchy: 
-- 1. EE (Civil) - Executive Engineer (Civil)
-- 2. EE (Mech) - Executive Engineer (Mech)
-- 3. DE/AE (Civil) - Deputy / Assistant Engineer (Civil)
-- 4. DE/AE (Mech) - Deputy / Assistant Engineer (Mech)
-- 5. Superintending Engineer (SE)
-- 6. Chief Engineer

CREATE TABLE IF NOT EXISTS public.scheme_engineer_details (
    id SERIAL PRIMARY KEY,
    region VARCHAR(100),
    district VARCHAR(100),
    division VARCHAR(100),
    scheme_id VARCHAR(100) NOT NULL,
    scheme VARCHAR(255),
    
    -- EE (Civil) - Executive Engineer
    ee_civil_name VARCHAR(255),
    ee_civil_email VARCHAR(255),
    ee_civil_mobile VARCHAR(20),
    
    -- EE (Mech) - Executive Engineer
    ee_mech_name VARCHAR(255),
    ee_mech_email VARCHAR(255),
    ee_mech_mobile VARCHAR(20),
    
    -- DE/AE (Civil)
    de_ae_civil_name VARCHAR(255),
    de_ae_civil_email VARCHAR(255),
    de_ae_civil_mobile VARCHAR(20),
    
    -- DE/AE (Mech)
    de_ae_mech_name VARCHAR(255),
    de_ae_mech_email VARCHAR(255),
    de_ae_mech_mobile VARCHAR(20),
    
    -- Superintending Engineer (SE)
    se_name VARCHAR(255),
    se_email VARCHAR(255),
    se_mobile VARCHAR(20),
    
    -- Chief Engineer
    chief_engineer_name VARCHAR(255),
    chief_engineer_email VARCHAR(255),
    chief_engineer_mobile VARCHAR(20)
);

-- Index for faster joins by scheme_id on Alerts queries
CREATE INDEX IF NOT EXISTS idx_scheme_engineer_details_scheme_id ON public.scheme_engineer_details(scheme_id);
