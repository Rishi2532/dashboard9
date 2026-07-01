const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:Ceinsys@2025@localhost:5432/water_scheme_dashboard' });

pool.query("SELECT * FROM vendor LIMIT 1").then(res => {
    console.log("Columns in vendor:");
    console.log(res.fields.map(f => f.name));
    return pool.query('SELECT COUNT(agency) FROM vendor WHERE agency IS NOT NULL');
}).then(res => {
    console.log("Count of agency in vendor: " + res.rows[0].count);
}).finally(() => pool.end());
