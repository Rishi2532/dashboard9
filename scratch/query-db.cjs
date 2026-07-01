const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_1mIcwNsqC8Hp@ep-sweet-glade-a1t4t87v-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' });
pool.query("SELECT scheme_id, scheme_name, agency_type FROM scheme_status WHERE scheme_name ILIKE '%Padali%'").then(res => {
  console.log(res.rows);
  pool.end();
}).catch(console.error);
