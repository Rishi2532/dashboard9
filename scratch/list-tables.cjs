const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:Ceinsys@2025@localhost:5432/water_scheme_dashboard' });

pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'").then(res => {
    console.log("Tables:");
    console.log(res.rows.map(r => r.table_name).join('\n'));
}).finally(() => pool.end());
