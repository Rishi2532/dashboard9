import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    const dates = ['09-Mar', '10-Mar', '11-Mar', '12-Mar', '13-Mar', '14-Mar', '15-Mar'];
    const dateParams = dates.map((_, i) => `$${i + 1}`).join(',');
    
    // Testing the exact logic with the fix applied
    const query = `
      WITH weekly_data AS (
          SELECT 
              region, circle, division, sub_division, block,
              scheme_id, scheme_name, village_name, population,
              lpcd_value, data_date, dashboard_url
          FROM water_scheme_data_history
          WHERE region IS NOT NULL
          AND village_name ILIKE '%Dahigaon%'
          AND scheme_name ILIKE '%Takli & 4%'
          AND (
              data_date IN (${dateParams})
          )
      )
      SELECT
          wd.village_name, wd.population,
          ROUND((SUM(COALESCE(NULLIF(TRIM(wd.lpcd_value::text), '')::numeric, 0)) / 7.0), 2) as lpcd_value,
          SUM(COALESCE(NULLIF(TRIM(wd.lpcd_value::text), '')::numeric, 0)) as total_sum,
          MAX(wd.data_date) as lpcd_date
      FROM weekly_data wd
      GROUP BY wd.region, wd.circle, wd.division, wd.sub_division, wd.block, wd.scheme_id, wd.scheme_name, wd.village_name, wd.population
    `;

    const result = await pool.query(query, dates);
    console.table(result.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

check();
