
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

async function check() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query(`
      WITH 
      deduplicated_villages AS (
        SELECT DISTINCT ON (scheme_id, block, village_name)
          scheme_id, scheme_name, region, block
        FROM water_scheme_data
        ORDER BY scheme_id, block, village_name, lpcd_value_day7 DESC NULLS LAST
      ),
      scheme_aggregation AS (
        SELECT 
          wsd.scheme_id, wsd.scheme_name, wsd.region, wsd.block
        FROM 
          deduplicated_villages wsd
        GROUP BY 
          wsd.scheme_id, wsd.scheme_name, wsd.region, wsd.block
      )
      SELECT COUNT(*) as fixed_count FROM (
        SELECT DISTINCT ON (scheme_id) *
        FROM scheme_aggregation
        WHERE scheme_name IS NOT NULL AND BTRIM(scheme_name) <> ''
        ORDER BY scheme_id, block
      ) t
    `);
    console.log('Fixed count with DISTINCT ON (scheme_id):', res.rows[0].fixed_count);

  } finally {
    await pool.end();
  }
}
check();
