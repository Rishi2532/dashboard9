-- Insert test scheme-level issues for Padali and Kurha
-- These will appear in the Weekly Avg table with red highlighting and alert icons

-- Get the user ID (assuming user ID 2 based on logs showing "username":"admin")
-- You can change created_by value if needed

-- Issue for Padali & 5 Villages RRWSS (LPCD: 20.3)
INSERT INTO issue_reports (
    problem_level,
    region,
    scheme_id,
    scheme_name,
    village_name,
    esr_name,
    status_value,
    reason,
    sensor_type,
    status,
    created_by,
    creator_name,
    created_at
) VALUES (
    'Scheme',
    'Amravati',
    '20094779',  -- Padali scheme ID from screenshot
    'Padali & 5 Villages RRWSS',
    NULL,  -- NULL for scheme-level issue
    NULL,  -- NULL for scheme-level issue
    'Not Achieved: 20.3 LPCD',
    'Low water supply due to pump maintenance issues. Expected resolution within 48 hours.',
    NULL,
    'Active',
    2,  -- User ID
    'Rushikesh Salunke',
    NOW()
);

-- Issue for Kurha & 2 Villages RRWSS (LPCD: 5.1)
INSERT INTO issue_reports (
    problem_level,
    region,
    scheme_id,
    scheme_name,
    village_name,
    esr_name,
    status_value,
    reason,
    sensor_type,
    status,
    created_by,
    creator_name,
    created_at
) VALUES (
    'Scheme',
    'Amravati',
    '7945938',  -- Kurha scheme ID from screenshot
    'Kurha & 2 Villages RRWSS',
    NULL,  -- NULL for scheme-level issue
    NULL,  -- NULL for scheme-level issue
    'Not Achieved: 5.1 LPCD',
    'Critical water shortage - main pipeline needs repair. Engineering team deployed.',
    NULL,
    'Active',
    2,  -- User ID
    'Rushikesh Salunke',
    NOW()
);

-- Verify the insertions
SELECT 
    id,
    problem_level,
    scheme_name,
    status_value,
    reason,
    status,
    creator_name,
    created_at
FROM issue_reports
WHERE scheme_name IN ('Padali & 5 Villages RRWSS', 'Kurha & 2 Villages RRWSS')
ORDER BY created_at DESC;
