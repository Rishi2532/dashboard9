const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:Ceinsys@2025@localhost:5432/water_scheme_dashboard' });

pool.query("SELECT scheme_id, scheme_name, agency_type, agency FROM scheme_status WHERE scheme_name ILIKE '%Kurum%'").then(res => {
    console.table(res.rows);
}).finally(() => pool.end());
