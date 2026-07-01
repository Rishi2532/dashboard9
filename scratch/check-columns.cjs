const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:Ceinsys@2025@localhost:5432/water_scheme_dashboard' });
pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'chlorine_data'")
  .then(res => console.log('chlorine_data:', res.rows.map(r=>r.column_name).join(', ')))
  .then(() => pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'scheme_status'"))
  .then(res => console.log('scheme_status:', res.rows.map(r=>r.column_name).join(', ')))
  .finally(() => pool.end());
