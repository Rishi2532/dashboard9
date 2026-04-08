
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

async function check() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query(`
      SELECT region, btrim(scheme_name) as name, count(*) as count, array_agg(scheme_id) as ids
      FROM scheme_status
      GROUP BY region, btrim(scheme_name)
      HAVING count(*) > 1
    `);
    console.log('Duplicate Scheme Names in same region in scheme_status:');
    res.rows.forEach(r => console.log(`Region: ${r.region}, Name: "${r.name}", Count: ${r.count}, IDs: ${r.ids.join(', ')}`));
    
    // Check total distinct names per region
    const resTotal = await pool.query(`
      SELECT count(DISTINCT (region, btrim(scheme_name))) as distinct_name_region_count
      FROM scheme_status
    `);
    console.log('\nTotal Distinct (Region, Scheme Name) pairs:', resTotal.rows[0].distinct_name_region_count);

    const resIds = await pool.query(`SELECT count(DISTINCT scheme_id) FROM scheme_status`);
    console.log('Total Distinct IDs in scheme_status:', resIds.rows[0].count);

  } finally {
    await pool.end();
  }
}
check();
