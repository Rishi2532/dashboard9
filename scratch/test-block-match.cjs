const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:Ceinsys@2025@localhost:5432/water_scheme_dashboard' });
pool.query(`SELECT block, agency_type FROM scheme_status WHERE scheme_id = '20028254'`)
  .then(res => console.log('scheme_status:', res.rows))
  .then(() => pool.query(`SELECT block FROM communication_status WHERE scheme_id = '20028254' LIMIT 1`))
  .then(res => console.log('communication_status:', res.rows))
  .finally(() => pool.end());
