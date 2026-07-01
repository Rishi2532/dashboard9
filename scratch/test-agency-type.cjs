const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:Ceinsys@2025@localhost:5432/water_scheme_dashboard' });
pool.query(`SELECT ss.agency_type, cs.scheme_id, cs.scheme_name FROM communication_status cs LEFT JOIN scheme_status ss ON cs.scheme_id = ss.scheme_id AND cs.block = ss.block LIMIT 5`)
  .then(res => console.log(res.rows))
  .finally(() => pool.end());
