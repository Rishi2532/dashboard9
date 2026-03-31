import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  const region = 'Amravati';
  
  // NOTE: I am not applying schemeIdFilter for this debug script because it requires the exact commissioned IDs. 
  // Let's first just see the raw numbers without the commissioning filter to see if the discrepancy exists organically.

  // Aggregate logic
  const aggregateQuery = `
          SELECT 
            SUM(CASE WHEN 
              (lpcd_value_day1 IS NULL OR lpcd_value_day1::numeric = 0) AND
              (lpcd_value_day2 IS NULL OR lpcd_value_day2::numeric = 0) AND
              (lpcd_value_day3 IS NULL OR lpcd_value_day3::numeric = 0) AND
              (lpcd_value_day4 IS NULL OR lpcd_value_day4::numeric = 0) AND
              (lpcd_value_day5 IS NULL OR lpcd_value_day5::numeric = 0) AND
              (lpcd_value_day6 IS NULL OR lpcd_value_day6::numeric = 0) AND
              (lpcd_value_day7 IS NULL OR lpcd_value_day7::numeric = 0)
            THEN 1 ELSE 0 END) as consistent_no_water,
            COUNT(*) as total
          FROM (
            SELECT DISTINCT ON (scheme_id, village_name, block) *
            FROM water_scheme_data
            WHERE region = $1
            ORDER BY scheme_id, village_name, block
          ) t
  `;

  const aggRes = await pool.query(aggregateQuery, [region]);
  console.log("Aggregate Query for Amravati:", aggRes.rows[0]);

  // Detailed logic
  const detailQuery = `
            SELECT COUNT(*) as detail_count FROM (
              SELECT DISTINCT ON (ws.scheme_id, ws.village_name, ws.block)
                ws.region, ws.block, ws.scheme_id, ws.village_name
              FROM water_scheme_data ws
              WHERE (ws.lpcd_value_day1 IS NULL OR ws.lpcd_value_day1 = 0)
                AND (ws.lpcd_value_day2 IS NULL OR ws.lpcd_value_day2 = 0)
                AND (ws.lpcd_value_day3 IS NULL OR ws.lpcd_value_day3 = 0)
                AND (ws.lpcd_value_day4 IS NULL OR ws.lpcd_value_day4 = 0)
                AND (ws.lpcd_value_day5 IS NULL OR ws.lpcd_value_day5 = 0)
                AND (ws.lpcd_value_day6 IS NULL OR ws.lpcd_value_day6 = 0)
                AND (ws.lpcd_value_day7 IS NULL OR ws.lpcd_value_day7 = 0)
              AND ws.region = $1
              ORDER BY ws.scheme_id, ws.village_name, ws.block
            ) as t
  `;
  const detailRes = await pool.query(detailQuery, [region]);
  console.log("Detailed List Query for Amravati:", detailRes.rows[0].detail_count);

  pool.end();
}

main().catch(console.error);
