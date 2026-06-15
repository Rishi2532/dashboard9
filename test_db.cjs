const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:Ceinsys@2025@localhost:5432/water_scheme_dashboard' });
pool.query('SELECT * FROM water_scheme_data WHERE lpcd_value_day7 = \'0\' LIMIT 1')
  .then(res => { console.log(res.rows[0]); pool.end(); })
  .catch(err => console.log(err));
