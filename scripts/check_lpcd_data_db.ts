import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const client = await pool.connect();
    try {
      console.log('=== CHECKING lpcd_data IN DATABASE ===');
      const res = await client.query(`
        SELECT 
          count(*) as total_villages,
          count(*) FILTER (WHERE lpcd_value_day7 < 55) as current_below_55_day7,
          count(*) FILTER (
            lpcd_value_day1 BETWEEN 0.01 AND 55 AND lpcd_value_day2 BETWEEN 0.01 AND 55 AND 
            lpcd_value_day3 BETWEEN 0.01 AND 55 AND lpcd_value_day4 BETWEEN 0.01 AND 55 AND 
            lpcd_value_day5 BETWEEN 0.01 AND 55 AND lpcd_value_day6 BETWEEN 0.01 AND 55 AND 
            lpcd_value_day7 BETWEEN 0.01 AND 55
          ) as strictly_consistent_all7days,
          count(*) FILTER (
            lpcd_value_day1 <= 55 AND lpcd_value_day2 <= 55 AND lpcd_value_day3 <= 55 AND 
            lpcd_value_day4 <= 55 AND lpcd_value_day5 <= 55 AND lpcd_value_day6 <= 55 AND 
            lpcd_value_day7 <= 55
          ) as consistent_all7days_with_zeros
        FROM lpcd_data
      `);
      console.log(res.rows[0]);

      // Check scheme-filtered count (only schemes in escalation portal)
      const escalationSchemeIds = [
        '7890975', '20027837', '7948936', '4918426', '7940695', '20017028',
        '20028168', '20017217', '20027978', '20013367', '631335', '631010',
        '20019216', '20028195', '2003645', '20021409', '20028298', '20018579',
        '7942142', '7890965', '7942125', '7338000', '20021406', '20030820',
        '7940233', '7928270', '20028065', '20016939', '20030459', '417239',
        '456654', '20054877', '417233', '7937337', '20092478', '20030798',
        '20030815', '20077212', '20027541'
      ];

      const resFiltered = await client.query(`
        SELECT 
          count(*) as total_villages_in_39_schemes,
          count(*) FILTER (WHERE lpcd_value_day7 < 55) as current_below_55_day7,
          count(*) FILTER (
            lpcd_value_day1 BETWEEN 0.01 AND 55 AND lpcd_value_day2 BETWEEN 0.01 AND 55 AND 
            lpcd_value_day3 BETWEEN 0.01 AND 55 AND lpcd_value_day4 BETWEEN 0.01 AND 55 AND 
            lpcd_value_day5 BETWEEN 0.01 AND 55 AND lpcd_value_day6 BETWEEN 0.01 AND 55 AND 
            lpcd_value_day7 BETWEEN 0.01 AND 55
          ) as strictly_consistent_all7days,
          count(*) FILTER (
            lpcd_value_day1 <= 55 AND lpcd_value_day2 <= 55 AND lpcd_value_day3 <= 55 AND 
            lpcd_value_day4 <= 55 AND lpcd_value_day5 <= 55 AND lpcd_value_day6 <= 55 AND 
            lpcd_value_day7 <= 55
          ) as consistent_all7days_with_zeros
        FROM lpcd_data
        WHERE scheme_id = ANY($1)
      `, [escalationSchemeIds]);
      console.log('\nIn the 39 Escalation Schemes:');
      console.log(resFiltered.rows[0]);

    } finally {
      client.release();
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}

run();
