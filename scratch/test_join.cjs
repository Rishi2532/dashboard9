const pg = require('pg');
require('dotenv').config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const q = await pool.query(`
    SELECT 
      ra.id,
      ra.scheme_id,
      s.scheme_name,
      sed.scheme_id as sed_scheme_id,
      sed.scheme as sed_scheme_name,
      sed.ee_civil_name,
      sed.chief_engineer_name
    FROM realtime_acknowledgements ra
    LEFT JOIN scheme_status s ON ra.scheme_id = s.scheme_id
    LEFT JOIN scheme_engineer_details sed ON (ra.scheme_id = sed.scheme_id OR s.scheme_name ILIKE sed.scheme)
    WHERE ra.sent_date = CURRENT_DATE
    LIMIT 3
  `);
  console.log('JOIN RESULT:', q.rows);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
