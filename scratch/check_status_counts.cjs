const pg = require('pg');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function checkCounts() {
  try {
    const res = await pool.query('SELECT fully_completion_scheme_status, COUNT(*) FROM scheme_status GROUP BY fully_completion_scheme_status');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkCounts();
