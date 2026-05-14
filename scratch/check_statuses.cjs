const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:Ceinsys@2025@localhost:5432/water_scheme_dashboard' });

async function check() {
  try {
    const res = await pool.query(`
      SELECT fully_completion_scheme_status, COUNT(*) 
      FROM scheme_status 
      WHERE water_supply = 'Yes'
      GROUP BY fully_completion_scheme_status
    `);
    console.log('Statuses for water_supply=Yes:', res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

check();
