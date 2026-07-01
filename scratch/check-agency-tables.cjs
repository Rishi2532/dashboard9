const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:Ceinsys@2025@localhost:5432/water_scheme_dashboard' });

pool.query("SELECT table_name, column_name FROM information_schema.columns WHERE column_name LIKE '%agency%' AND table_schema = 'public'").then(res => {
    console.log("tables with agency:");
    console.log(res.rows);
}).finally(() => pool.end());
