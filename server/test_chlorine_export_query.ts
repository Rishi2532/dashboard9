
import { sql } from "drizzle-orm";
import { getDB } from "./db";

async function testChlorineExportQuery() {
  const db = await getDB();
  console.log("Testing Fixed Chlorine Export Query...");

  try {
    const daysNum = 2; // Testing for 2 days
    const region = null;
    
    // Condition for below 0.2
    const chlorineCondition = sql`CASE WHEN ch.chlorine_value < 0.2 THEN 1 ELSE 0 END as is_metric_match`;
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
        SELECT 
          pc.region,
          cs.circle,
          cs.division,
          cs.sub_division,
          cs.block,
          pc.scheme_id,
          cs.scheme_name,
          pc.village_name,
          pc.esr_name,
          cs.chlorine_connected,
          cs.chlorine_status,
          cs.last_seen,
          pc.consecutive_days,
          cd.chlorine_value_7 as latest_chlorine_value,
          cd.chlorine_date_day_7 as latest_chlorine_date
        FROM chlorine_consecutive pc
        LEFT JOIN communication_status cs ON (
          pc.scheme_id = cs.scheme_id AND
          pc.village_name = cs.village_name AND
          pc.esr_name = cs.esr_name
        )
        LEFT JOIN chlorine_data cd ON (
           pc.scheme_id = cd.scheme_id AND
           pc.village_name = cd.village_name AND
           pc.esr_name = cd.esr_name
        )
        WHERE pc.consecutive_days = ${daysNum}
        ORDER BY pc.region, pc.scheme_id, pc.village_name, pc.esr_name
        LIMIT 5
      `;
      
      const result = await db.execute(query);
      console.log("Success! Export query executed.");
      console.log("Sample export rows:", result.rows);

  } catch (error) {
    console.error("FAILED with error:", error);
  }
  process.exit(0);
}

testChlorineExportQuery();
