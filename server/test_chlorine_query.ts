
import { sql } from "drizzle-orm";
import { getDB } from "./db";

async function testChlorineQuery() {
  const db = await getDB();
  console.log("Testing Fixed Chlorine SQL Query...");

  try {
    const daysNum = 1;
    const metric = 'above_0_5';
    const region = null; // all regions

    // Mimic the logic from chlorine-routes.ts
    const chlorineCondition = sql`CASE WHEN ch.chlorine_value > 0.5 THEN 1 ELSE 0 END as is_metric_match`;
    const chlorineRegionFilter = sql``;
    const chlorineSchemeFilter = sql``;

    const query = sql`
        WITH ranked_history AS (
          SELECT 
            ch.scheme_id,
            ch.village_name,
            ch.esr_name,
            ch.region,
            CASE 
              WHEN regexp_replace(ch.chlorine_date, '\\s', '', 'g') ~ '^[0-9.]+$' AND length(regexp_replace(ch.chlorine_date, '\\s', '', 'g')) <= 7 THEN (DATE '1899-12-30' + (regexp_replace(ch.chlorine_date, '\\s', '', 'g')::numeric)::integer)
              WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(ch.chlorine_date, 'DD-Mon-YYYY')
              WHEN ch.chlorine_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(ch.chlorine_date, 'YYYY-MM-DD')
              ELSE NULL 
            END as date_val,
            
            LAG(
              CASE 
                WHEN regexp_replace(ch.chlorine_date, '\\s', '', 'g') ~ '^[0-9.]+$' AND length(regexp_replace(ch.chlorine_date, '\\s', '', 'g')) <= 7 THEN (DATE '1899-12-30' + (regexp_replace(ch.chlorine_date, '\\s', '', 'g')::numeric)::integer)
                WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(ch.chlorine_date, 'DD-Mon-YYYY')
                WHEN ch.chlorine_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(ch.chlorine_date, 'YYYY-MM-DD')
                ELSE NULL 
              END
            ) OVER (
              PARTITION BY ch.scheme_id, ch.village_name, ch.esr_name 
              ORDER BY 
              CASE 
                WHEN regexp_replace(ch.chlorine_date, '\\s', '', 'g') ~ '^[0-9.]+$' AND length(regexp_replace(ch.chlorine_date, '\\s', '', 'g')) <= 7 THEN (DATE '1899-12-30' + (regexp_replace(ch.chlorine_date, '\\s', '', 'g')::numeric)::integer)
                WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(ch.chlorine_date, 'DD-Mon-YYYY')
                WHEN ch.chlorine_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(ch.chlorine_date, 'YYYY-MM-DD')
                ELSE NULL 
              END DESC NULLS LAST
            ) as prev_date_val,

            ROW_NUMBER() OVER (
              PARTITION BY ch.scheme_id, ch.village_name, ch.esr_name 
              ORDER BY 
              CASE 
                WHEN regexp_replace(ch.chlorine_date, '\\s', '', 'g') ~ '^[0-9.]+$' AND length(regexp_replace(ch.chlorine_date, '\\s', '', 'g')) <= 7 THEN (DATE '1899-12-30' + (regexp_replace(ch.chlorine_date, '\\s', '', 'g')::numeric)::integer)
                WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(ch.chlorine_date, 'DD-Mon-YYYY')
                WHEN ch.chlorine_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(ch.chlorine_date, 'YYYY-MM-DD')
                ELSE NULL 
              END DESC NULLS LAST
            ) as rn,
            ${chlorineCondition}
          FROM chlorine_history ch
          WHERE 
            CASE 
              WHEN regexp_replace(ch.chlorine_date, '\\s', '', 'g') ~ '^[0-9.]+$' AND length(regexp_replace(ch.chlorine_date, '\\s', '', 'g')) <= 7 THEN (DATE '1899-12-30' + (regexp_replace(ch.chlorine_date, '\\s', '', 'g')::numeric)::integer)
              WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(ch.chlorine_date, 'DD-Mon-YYYY')
              WHEN ch.chlorine_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(ch.chlorine_date, 'YYYY-MM-DD')
              ELSE NULL 
            END >= CURRENT_DATE - INTERVAL '365 days'
            AND 
            CASE 
              WHEN regexp_replace(ch.chlorine_date, '\\s', '', 'g') ~ '^[0-9.]+$' AND length(regexp_replace(ch.chlorine_date, '\\s', '', 'g')) <= 7 THEN (DATE '1899-12-30' + (regexp_replace(ch.chlorine_date, '\\s', '', 'g')::numeric)::integer)
              WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(ch.chlorine_date, 'DD-Mon-YYYY')
              WHEN ch.chlorine_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(ch.chlorine_date, 'YYYY-MM-DD')
              ELSE NULL 
            END <= CURRENT_DATE
            AND ch.chlorine_value IS NOT NULL
            ${chlorineRegionFilter}
            ${chlorineSchemeFilter}
        ),
        valid_history AS (
          SELECT *,
            CASE 
              WHEN prev_date_val IS NOT NULL AND (prev_date_val - date_val) > 1 THEN 1 
              ELSE 0 
            END as is_gap
          FROM ranked_history
        ),
        chlorine_consecutive AS (
          SELECT 
            rh1.scheme_id,
            rh1.village_name,
            rh1.esr_name,
            rh1.region,
            COALESCE((
              SELECT COUNT(*)
              FROM valid_history rh2
              WHERE rh2.scheme_id = rh1.scheme_id
                AND rh2.village_name = rh1.village_name
                AND rh2.esr_name = rh1.esr_name
                AND rh2.rn <= (
                  SELECT COALESCE(MIN(rh3.rn) - 1, 30)
                  FROM valid_history rh3
                  WHERE rh3.scheme_id = rh1.scheme_id
                    AND rh3.village_name = rh1.village_name
                    AND rh3.esr_name = rh1.esr_name
                    AND (rh3.is_metric_match = 0 OR rh3.is_gap = 1)
                    AND rh3.rn > 0
                )
                AND rh2.is_metric_match = 1
            ), 0) as consecutive_days
          FROM (SELECT DISTINCT scheme_id, village_name, esr_name, region FROM valid_history) rh1
        )
        SELECT * FROM chlorine_consecutive LIMIT 5
    `;

    const result = await db.execute(query);
    console.log("Success! Query executed.");
    console.log("Sample rows:", result.rows);

  } catch (error) {
    console.error("FAILED with error:", error);
  }
  process.exit(0);
}

testChlorineQuery();
