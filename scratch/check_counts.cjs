const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:Ceinsys@2025@localhost:5432/water_scheme_dashboard' });

async function check() {
  try {
    const res = await pool.query(`
      SELECT COUNT(DISTINCT scheme_id) 
      FROM scheme_status 
      WHERE water_supply = 'Yes' 
      AND LOWER(fully_completion_scheme_status) IN ('fully completed', 'completed', 'in progress')
    `);
    console.log('Qualifying schemes count:', res.rows[0].count);
    
    const res2 = await pool.query(`
      SELECT scheme_id, scheme_name, fully_completion_scheme_status 
      FROM scheme_status 
      WHERE water_supply = 'Yes' 
      AND LOWER(fully_completion_scheme_status) IN ('fully completed', 'completed', 'in progress')
    `);
    console.log('Schemes list count:', res2.rows.length);
    
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

check();
