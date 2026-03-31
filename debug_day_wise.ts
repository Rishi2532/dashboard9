import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  
  const metric = "below_0_2";
  const daysNum = 2;

  // Simulate aggregate logic: Check how many sensors have consecutive_below_0_2 >= 2 purely from chlorine_history
  const aggQuery = `
        WITH ranked_history AS (
          SELECT 
            ch.scheme_id,
            ch.village_name,
            ch.esr_name,
            -- Same basic gap detection without the crazy date parsing for simplicity, just relying on raw sequence
            ROW_NUMBER() OVER (
              PARTITION BY ch.scheme_id, ch.village_name, ch.esr_name 
              ORDER BY ch.chlorine_date DESC
            ) as rn,
            CASE WHEN ch.chlorine_value < 0.2 THEN 1 ELSE 0 END as is_below
          FROM chlorine_history ch
          WHERE ch.chlorine_value IS NOT NULL
        ),
        chlorine_consecutive AS (
          SELECT 
            rh1.scheme_id,
            rh1.village_name,
            rh1.esr_name,
            COALESCE((
              SELECT COUNT(*)
              FROM ranked_history rh2
              WHERE rh2.scheme_id = rh1.scheme_id
                AND rh2.village_name = rh1.village_name
                AND rh2.esr_name = rh1.esr_name
                AND rh2.rn <= (
                  SELECT COALESCE(MIN(rh3.rn) - 1, 30)
                  FROM ranked_history rh3
                  WHERE rh3.scheme_id = rh1.scheme_id
                    AND rh3.village_name = rh1.village_name
                    AND rh3.esr_name = rh1.esr_name
                    AND (rh3.is_below = 0)
                    AND rh3.rn > 0
                )
                AND rh2.is_below = 1
            ), 0) as consecutive_below_0_2
          FROM (SELECT DISTINCT scheme_id, village_name, esr_name FROM ranked_history) rh1
        )
        SELECT COUNT(*) as agg_count 
        FROM chlorine_consecutive 
        WHERE consecutive_below_0_2 >= 2
  `;
  
  // Actually, let's just use the exact logic from storage.ts to count agg vs detail.
  const query = `
        WITH ranked_history AS (
          SELECT 
            ch.scheme_id,
            ch.village_name,
            ch.esr_name,
            ch.chlorine_value,
            ch.chlorine_date,
            (
            CASE 
              WHEN regexp_replace(ch.chlorine_date, '\\s', '', 'g') ~ '^[0-9.]+$' AND length(regexp_replace(ch.chlorine_date, '\\s', '', 'g')) <= 7 THEN (DATE '1899-12-30' + (regexp_replace(ch.chlorine_date, '\\s', '', 'g')::numeric)::integer)
              WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(ch.chlorine_date, 'DD-Mon-YYYY')
              WHEN ch.chlorine_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(ch.chlorine_date, 'YYYY-MM-DD')
              WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}$' THEN 
                CASE 
                  WHEN TO_DATE(ch.chlorine_date || '-' || EXTRACT(YEAR FROM CURRENT_DATE), 'DD-Mon-YYYY') > CURRENT_DATE 
                  THEN TO_DATE(ch.chlorine_date || '-' || (EXTRACT(YEAR FROM CURRENT_DATE) - 1), 'DD-Mon-YYYY')
                  ELSE TO_DATE(ch.chlorine_date || '-' || EXTRACT(YEAR FROM CURRENT_DATE), 'DD-Mon-YYYY')
                END
              ELSE NULL 
            END
            ) as date_val,
            LAG(
              CASE 
                WHEN regexp_replace(ch.chlorine_date, '\\s', '', 'g') ~ '^[0-9.]+$' AND length(regexp_replace(ch.chlorine_date, '\\s', '', 'g')) <= 7 THEN (DATE '1899-12-30' + (regexp_replace(ch.chlorine_date, '\\s', '', 'g')::numeric)::integer)
                WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(ch.chlorine_date, 'DD-Mon-YYYY')
                WHEN ch.chlorine_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(ch.chlorine_date, 'YYYY-MM-DD')
                WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}$' THEN 
                  CASE 
                    WHEN TO_DATE(ch.chlorine_date || '-' || EXTRACT(YEAR FROM CURRENT_DATE), 'DD-Mon-YYYY') > CURRENT_DATE 
                    THEN TO_DATE(ch.chlorine_date || '-' || (EXTRACT(YEAR FROM CURRENT_DATE) - 1), 'DD-Mon-YYYY')
                    ELSE TO_DATE(ch.chlorine_date || '-' || EXTRACT(YEAR FROM CURRENT_DATE), 'DD-Mon-YYYY')
                  END
                ELSE NULL 
              END
            ) OVER (
              PARTITION BY ch.scheme_id, ch.village_name, ch.esr_name 
              ORDER BY (
                CASE 
                  WHEN regexp_replace(ch.chlorine_date, '\\s', '', 'g') ~ '^[0-9.]+$' AND length(regexp_replace(ch.chlorine_date, '\\s', '', 'g')) <= 7 THEN (DATE '1899-12-30' + (regexp_replace(ch.chlorine_date, '\\s', '', 'g')::numeric)::integer)
                  WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(ch.chlorine_date, 'DD-Mon-YYYY')
                  WHEN ch.chlorine_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(ch.chlorine_date, 'YYYY-MM-DD')
                  WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}$' THEN TO_DATE(ch.chlorine_date || '-' || EXTRACT(YEAR FROM CURRENT_DATE), 'DD-Mon-YYYY')
                  ELSE NULL 
                END
              ) DESC
            ) as prev_date_val,
            ROW_NUMBER() OVER (
              PARTITION BY ch.scheme_id, ch.village_name, ch.esr_name, (
                CASE 
                  WHEN regexp_replace(ch.chlorine_date, '\\s', '', 'g') ~ '^[0-9.]+$' AND length(regexp_replace(ch.chlorine_date, '\\s', '', 'g')) <= 7 THEN (DATE '1899-12-30' + (regexp_replace(ch.chlorine_date, '\\s', '', 'g')::numeric)::integer)
                  WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(ch.chlorine_date, 'DD-Mon-YYYY')
                  WHEN ch.chlorine_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(ch.chlorine_date, 'YYYY-MM-DD')
                  WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}$' THEN TO_DATE(ch.chlorine_date || '-' || EXTRACT(YEAR FROM CURRENT_DATE), 'DD-Mon-YYYY')
                  ELSE NULL 
                END
              )
              ORDER BY ch.chlorine_value DESC
            ) as dedup_rn,
            ROW_NUMBER() OVER (PARTITION BY ch.scheme_id, ch.village_name, ch.esr_name ORDER BY (
              CASE 
                WHEN regexp_replace(ch.chlorine_date, '\\s', '', 'g') ~ '^[0-9.]+$' AND length(regexp_replace(ch.chlorine_date, '\\s', '', 'g')) <= 7 THEN (DATE '1899-12-30' + (regexp_replace(ch.chlorine_date, '\\s', '', 'g')::numeric)::integer)
                WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(ch.chlorine_date, 'DD-Mon-YYYY')
                WHEN ch.chlorine_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(ch.chlorine_date, 'YYYY-MM-DD')
                WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}$' THEN TO_DATE(ch.chlorine_date || '-' || EXTRACT(YEAR FROM CURRENT_DATE), 'DD-Mon-YYYY')
                ELSE NULL 
              END
            ) DESC) as rn,
            CASE WHEN ch.chlorine_value < 0.2 THEN 1 ELSE 0 END as is_below
          FROM chlorine_history ch
          WHERE ch.chlorine_value IS NOT NULL
        ),
        deduped_history AS (
          SELECT * FROM ranked_history WHERE dedup_rn = 1
        ),
        valid_history AS (
          SELECT *,
            CASE 
              WHEN prev_date_val IS NOT NULL AND (prev_date_val - date_val) > 1 THEN 1 
              ELSE 0 
            END as is_gap
          FROM deduped_history
        ),
        chlorine_consecutive AS (
          SELECT 
            rh1.scheme_id, rh1.village_name, rh1.esr_name,
            COALESCE((
              SELECT COUNT(*)
              FROM valid_history rh2
              WHERE rh2.scheme_id = rh1.scheme_id AND rh2.village_name = rh1.village_name AND rh2.esr_name = rh1.esr_name
                AND rh2.rn <= COALESCE((SELECT MIN(rh3.rn) - 1 FROM valid_history rh3 WHERE rh3.scheme_id = rh1.scheme_id AND rh3.village_name = rh1.village_name AND rh3.esr_name = rh1.esr_name AND (rh3.is_below = 0 OR rh3.is_gap = 1) AND rh3.rn > 0), 30)
                AND rh2.is_below = 1
            ), 0) as consecutive_below_0_2
          FROM (SELECT DISTINCT scheme_id, village_name, esr_name FROM valid_history) rh1
        )
        SELECT 
            COUNT(*) as agg_tot,
            SUM(CASE WHEN cs.chlorine_connected = 'Connected' THEN 1 ELSE 0 END) as with_connected,
            SUM(CASE WHEN cs.id IS NULL THEN 1 ELSE 0 END) as missing_in_cs
        FROM chlorine_consecutive cc
        LEFT JOIN communication_status cs ON (cc.scheme_id = cs.scheme_id AND cc.village_name = cs.village_name AND cc.esr_name = cs.esr_name)
        WHERE cc.consecutive_below_0_2 >= 2
  `;

  const aggRes = await pool.query(query);
  console.log(`Aggregate Total (Raw chlorine_history): ${aggRes.rows[0].agg_tot}`);
  console.log(`Total IF filtered by 'Connected' in communication_status: ${aggRes.rows[0].with_connected}`);
  console.log(`Missing entirely from communication_status: ${aggRes.rows[0].missing_in_cs}`);
  
  pool.end();
}

main().catch(console.error);
