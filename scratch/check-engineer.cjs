const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:Ceinsys@2025@localhost:5432/water_scheme_dashboard' });

pool.query("SELECT * FROM scheme_engineer_details LIMIT 1").then(res => {
    console.log("Columns in scheme_engineer_details:");
    console.log(res.fields.map(f => f.name));
}).finally(() => pool.end());
