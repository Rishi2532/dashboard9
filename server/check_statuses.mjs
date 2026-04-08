import pg from 'pg';
const { Pool } = pg;

async function check() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT DISTINCT fully_completion_scheme_status, COUNT(*) 
      FROM scheme_status 
      GROUP BY fully_completion_scheme_status
    `);
    console.log("Status counts:");
    console.table(res.rows);

    const rule1 = await client.query(`
      SELECT COUNT(DISTINCT scheme_id) 
      FROM scheme_status 
      WHERE TRIM(LOWER(fully_completion_scheme_status)) IN ('fully completed', 'completed', 'in progress')
    `);
    console.log("Rule 1 Count (All Schemes):", rule1.rows[0].count);

    const total = await client.query(`SELECT COUNT(DISTINCT scheme_id) FROM scheme_status`);
    console.log("Total Distinct Schemes in table:", total.rows[0].count);

  } finally {
    client.release();
    await pool.end();
  }
}

check();
