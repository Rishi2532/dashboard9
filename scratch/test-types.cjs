const { Pool } = require('pg');
require('dotenv').config({ path: 'c:\\Users\\12626\\dashboard8\\.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function test() {
  try {
    const res = await pool.query("SELECT * FROM scheme_status LIMIT 1");
    console.log("Scheme_status scheme_id type:", typeof res.rows[0].scheme_id, res.rows[0].scheme_id);
    
    const res2 = await pool.query("SELECT * FROM scheme_lpcd_history LIMIT 1");
    console.log("scheme_lpcd_history scheme_id type:", typeof res2.rows[0].scheme_id, res2.rows[0].scheme_id);
    
    const joinRes = await pool.query(`
      SELECT 
        h.scheme_id,
        MAX(ss.agency_type) as agency_type
      FROM scheme_lpcd_history h
      LEFT JOIN scheme_status ss ON h.scheme_id = ss.scheme_id
      GROUP BY h.scheme_id
      LIMIT 5
    `);
    console.log("Join result:", joinRes.rows);
  } catch(e) {
    console.error("DB Error", e);
  } finally {
    pool.end();
  }
}
test();
