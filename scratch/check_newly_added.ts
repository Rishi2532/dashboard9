import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const wsStartTime = '2026-03-31T12:25:58.326Z';
    const wsEndTime = '2026-04-30T12:27:00.741Z';

    console.log("Analyzing village counts by region:");
    const res = await pool.query(`
      SELECT 
        COALESCE(start_info.region, end_info.region) as region_name,
        COALESCE(start_info.start_count, 0) as start_villages_count,
        COALESCE(end_info.end_count, 0) as end_villages_count,
        (COALESCE(end_info.end_count, 0) - COALESCE(start_info.start_count, 0)) as delta_villages
      FROM (
        SELECT region, COUNT(DISTINCT village_name) as start_count
        FROM water_scheme_data_history
        WHERE ABS(EXTRACT(EPOCH FROM (uploaded_at - $1::timestamptz))) < 60
        GROUP BY region
      ) start_info
      FULL OUTER JOIN (
        SELECT region, COUNT(DISTINCT village_name) as end_count
        FROM water_scheme_data_history
        WHERE ABS(EXTRACT(EPOCH FROM (uploaded_at - $2::timestamptz))) < 60
        GROUP BY region
      ) end_info ON start_info.region = end_info.region
    `, [wsStartTime, wsEndTime]);

    console.table(res.rows);

    // Let's print the actual names in the delta for each region
    for (const r of res.rows) {
      if (r.delta_villages !== 0) {
        const added = await pool.query(`
          SELECT DISTINCT village_name 
          FROM water_scheme_data_history 
          WHERE ABS(EXTRACT(EPOCH FROM (uploaded_at - $2::timestamptz))) < 60
            AND region = $3
            AND village_name NOT IN (
              SELECT DISTINCT village_name 
              FROM water_scheme_data_history 
              WHERE ABS(EXTRACT(EPOCH FROM (uploaded_at - $1::timestamptz))) < 60
                AND region = $3
            )
        `, [wsStartTime, wsEndTime, r.region_name]);
        
        const removed = await pool.query(`
          SELECT DISTINCT village_name 
          FROM water_scheme_data_history 
          WHERE ABS(EXTRACT(EPOCH FROM (uploaded_at - $1::timestamptz))) < 60
            AND region = $3
            AND village_name NOT IN (
              SELECT DISTINCT village_name 
              FROM water_scheme_data_history 
              WHERE ABS(EXTRACT(EPOCH FROM (uploaded_at - $2::timestamptz))) < 60
                AND region = $3
            )
        `, [wsStartTime, wsEndTime, r.region_name]);

        console.log(`Region: ${r.region_name}`);
        console.log("  Added villages:", added.rows.map(v => v.village_name));
        console.log("  Removed villages:", removed.rows.map(v => v.village_name));
      }
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

main();
