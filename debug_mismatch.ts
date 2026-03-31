import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  const dates = ["23-Mar","24-Mar","25-Mar","26-Mar","27-Mar","28-Mar","29-Mar"];
  
  // Storage.ts Logic
  const storageQuery = `
        WITH deduplicated_history AS (
          SELECT DISTINCT ON (scheme_id, village_name, block, data_date)
            region, scheme_id, village_name, block, lpcd_value, data_date
          FROM water_scheme_data_history
          WHERE (
            data_date IN ($1, $2, $3, $4, $5, $6, $7)
            OR
            TO_CHAR(TO_DATE(CASE 
               WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN data_date
               ELSE '01-Jan-2000'
            END, 'DD-Mon-YY'), 'DD-Mon') IN ($1, $2, $3, $4, $5, $6, $7)
          )
          AND region = 'Pune'
          ORDER BY scheme_id, village_name, block, data_date, (lpcd_value IS NOT NULL AND TRIM(lpcd_value::text) != '') DESC, uploaded_at DESC
        ),
        village_averages AS (
          SELECT 
            region, scheme_id, village_name, block,
            SUM(COALESCE(NULLIF(TRIM(lpcd_value::text), '')::numeric, 0)) / 7.0 as avg_lpcd
          FROM deduplicated_history
          GROUP BY region, scheme_id, village_name, block
        )
        SELECT 
          COUNT(CASE WHEN avg_lpcd >= 55 THEN 1 END)::integer as above_55,
          COUNT(CASE WHEN avg_lpcd < 55 AND avg_lpcd > 0 THEN 1 END)::integer as below_55,
          COUNT(CASE WHEN avg_lpcd = 0 OR avg_lpcd IS NULL THEN 1 END)::integer as no_water,
          COUNT(*) as total
        FROM village_averages;
  `;

  const storageRes = await pool.query(storageQuery, dates);
  console.log("Storage.ts (Table Count) for Pune:", storageRes.rows[0]);

  // Chlorine-routes.ts Logic (Detail List)
  const detailQuery = `
        WITH weekly_data AS (
          SELECT DISTINCT ON (scheme_id, village_name, block, data_date)
            region, circle, division, sub_division, block,
            scheme_id, scheme_name, village_name, population,
            lpcd_value, water_value, data_date, dashboard_url
          FROM water_scheme_data_history
          WHERE region IS NOT NULL
          AND region = 'Pune'
          AND (
              data_date IN ($1, $2, $3, $4, $5, $6, $7)
              OR
              TO_CHAR(TO_DATE(CASE 
                 WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN data_date
                 ELSE '01-Jan-2000'
              END, 'DD-Mon-YY'), 'DD-Mon') IN ($1, $2, $3, $4, $5, $6, $7)
          )
          ORDER BY scheme_id, village_name, block, data_date, (lpcd_value IS NOT NULL AND TRIM(lpcd_value::text) != '') DESC, uploaded_at DESC
        ),
        village_stats AS (
          SELECT
              region, MAX(circle) as circle, MAX(division) as division, MAX(sub_division) as sub_division, block,
              scheme_id, MAX(scheme_name) as scheme_name, village_name, MAX(population) as population,
              ROUND((SUM(COALESCE(NULLIF(TRIM(lpcd_value::text), '')::numeric, 0)) / 7.0), 2) as lpcd_value
          FROM weekly_data
          GROUP BY region, scheme_id, block, village_name
        )
        SELECT COUNT(*) as detail_count
        FROM village_stats vs
        LEFT JOIN water_scheme_data wsd ON vs.scheme_id = wsd.scheme_id AND vs.village_name = wsd.village_name AND vs.block = wsd.block
        WHERE vs.lpcd_value > 0 AND vs.lpcd_value < 55;
  `;
  const detailRes = await pool.query(detailQuery, dates);
  console.log("Chlorine-routes.ts (Detail Count) for <55 Pune:", detailRes.rows[0].detail_count);

  const detailTotalQuery = `
        WITH weekly_data AS (
          SELECT DISTINCT ON (scheme_id, village_name, block, data_date)
            region, circle, division, sub_division, block,
            scheme_id, scheme_name, village_name, population,
            lpcd_value, water_value, data_date, dashboard_url
          FROM water_scheme_data_history
          WHERE region IS NOT NULL
          AND region = 'Pune'
          AND (
              data_date IN ($1, $2, $3, $4, $5, $6, $7)
              OR
              TO_CHAR(TO_DATE(CASE 
                 WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN data_date
                 ELSE '01-Jan-2000'
              END, 'DD-Mon-YY'), 'DD-Mon') IN ($1, $2, $3, $4, $5, $6, $7)
          )
          ORDER BY scheme_id, village_name, block, data_date, (lpcd_value IS NOT NULL AND TRIM(lpcd_value::text) != '') DESC, uploaded_at DESC
        ),
        village_stats AS (
          SELECT
              region, block, scheme_id, village_name
          FROM weekly_data
          GROUP BY region, scheme_id, block, village_name
        )
        SELECT COUNT(*) as detail_total_count
        FROM village_stats vs
        LEFT JOIN water_scheme_data wsd ON vs.scheme_id = wsd.scheme_id AND vs.village_name = wsd.village_name AND vs.block = wsd.block;
  `;
  const detailTotalRes = await pool.query(detailTotalQuery, dates);
  console.log("Chlorine-routes.ts (Detail TOTAL Count) for Pune:", detailTotalRes.rows[0].detail_total_count);

  const detailTotalNoJoinQuery = `
  WITH weekly_data AS (
    SELECT DISTINCT ON (scheme_id, village_name, block, data_date)
      region, circle, division, sub_division, block,
      scheme_id, scheme_name, village_name, population,
      lpcd_value, water_value, data_date, dashboard_url
    FROM water_scheme_data_history
    WHERE region IS NOT NULL
    AND region = 'Pune'
    AND (
        data_date IN ($1, $2, $3, $4, $5, $6, $7)
        OR
        TO_CHAR(TO_DATE(CASE 
           WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN data_date
           ELSE '01-Jan-2000'
        END, 'DD-Mon-YY'), 'DD-Mon') IN ($1, $2, $3, $4, $5, $6, $7)
    )
    ORDER BY scheme_id, village_name, block, data_date, (lpcd_value IS NOT NULL AND TRIM(lpcd_value::text) != '') DESC, uploaded_at DESC
  ),
  village_stats AS (
    SELECT
        region, block, scheme_id, village_name
    FROM weekly_data
    GROUP BY region, scheme_id, block, village_name
  )
  SELECT COUNT(*) as detail_total_no_join_count
  FROM village_stats vs;
  `;
  
  const detailTotalNoJoinRes = await pool.query(detailTotalNoJoinQuery, dates);
  console.log("Chlorine-routes.ts (Detail TOTAL No Join) for Pune:", detailTotalNoJoinRes.rows[0].detail_total_no_join_count);

  pool.end();
}

main().catch(console.error);
