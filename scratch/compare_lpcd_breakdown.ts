import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    const query = `
      WITH 
      deduplicated AS (
        SELECT DISTINCT ON (scheme_id, village_name, data_date)
          scheme_id,
          village_name,
          lpcd_value::numeric as lpcd_value,
          data_date,
          CASE 
            WHEN data_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN data_date::date
            WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(data_date, 'DD-Mon-YY')
            WHEN data_date ~ '^[0-9]+-[A-Za-z]+$' THEN 
              CASE
                WHEN TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY') > (COALESCE(uploaded_at, CURRENT_DATE) + interval '1 month')
                THEN TO_DATE(data_date || '-' || (TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY')::int - 1), 'DD-Mon-YYYY')
                ELSE TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY')
              END
            ELSE NULL 
          END as parsed_date
        FROM water_scheme_data_history wh
        WHERE data_date IS NOT NULL
        ORDER BY scheme_id, village_name, data_date, uploaded_at DESC NULLS LAST
      ),
      ranked AS (
        SELECT 
          scheme_id,
          village_name,
          lpcd_value,
          parsed_date,
          ROW_NUMBER() OVER (PARTITION BY scheme_id, village_name ORDER BY parsed_date DESC NULLS LAST) as rn,
          CASE WHEN lpcd_value > 0 AND lpcd_value < 55 THEN 1 ELSE 0 END as is_below_55,
          CASE WHEN lpcd_value >= 55 THEN 1 ELSE 0 END as is_above_55,
          CASE WHEN lpcd_value > 0 THEN 1 ELSE 0 END as has_water,
          CASE WHEN lpcd_value IS NULL OR lpcd_value = 0 THEN 1 ELSE 0 END as no_water
        FROM deduplicated
        WHERE parsed_date IS NOT NULL
      ),
      with_groups AS (
        SELECT 
          scheme_id,
          village_name,
          rn,
          is_below_55,
          is_above_55,
          has_water,
          no_water,
          rn - ROW_NUMBER() OVER (PARTITION BY scheme_id, village_name, is_below_55 ORDER BY rn) as grp_below_55,
          rn - ROW_NUMBER() OVER (PARTITION BY scheme_id, village_name, is_above_55 ORDER BY rn) as grp_above_55,
          rn - ROW_NUMBER() OVER (PARTITION BY scheme_id, village_name, has_water ORDER BY rn) as grp_with_water,
          rn - ROW_NUMBER() OVER (PARTITION BY scheme_id, village_name, no_water ORDER BY rn) as grp_no_water
        FROM ranked
        WHERE rn <= 30
      ),
      consecutive_streaks AS (
        SELECT 
          scheme_id,
          village_name,
          MAX(CASE WHEN is_below_55 = 1 AND rn = 1 THEN 
            (SELECT COUNT(*) FROM with_groups wg2 
             WHERE wg2.scheme_id = with_groups.scheme_id 
             AND wg2.village_name = with_groups.village_name 
             AND wg2.is_below_55 = 1 
             AND wg2.grp_below_55 = with_groups.grp_below_55)
          ELSE 0 END) as consecutive_below_55,
          MAX(CASE WHEN is_above_55 = 1 AND rn = 1 THEN 
            (SELECT COUNT(*) FROM with_groups wg2 
             WHERE wg2.scheme_id = with_groups.scheme_id 
             AND wg2.village_name = with_groups.village_name 
             AND wg2.is_above_55 = 1 
             AND wg2.grp_above_55 = with_groups.grp_above_55)
          ELSE 0 END) as consecutive_above_55,
          MAX(CASE WHEN has_water = 1 AND rn = 1 THEN 
            (SELECT COUNT(*) FROM with_groups wg2 
             WHERE wg2.scheme_id = with_groups.scheme_id 
             AND wg2.village_name = with_groups.village_name 
             AND wg2.has_water = 1 
             AND wg2.grp_with_water = with_groups.grp_with_water)
          ELSE 0 END) as consecutive_with_water,
          MAX(CASE WHEN no_water = 1 AND rn = 1 THEN 
            (SELECT COUNT(*) FROM with_groups wg2 
             WHERE wg2.scheme_id = with_groups.scheme_id 
             AND wg2.village_name = with_groups.village_name 
             AND wg2.no_water = 1 
             AND wg2.grp_no_water = with_groups.grp_no_water)
          ELSE 0 END) as consecutive_no_water
        FROM with_groups
        GROUP BY scheme_id, village_name
      ),
      day_counts AS (
        SELECT LEAST(consecutive_below_55, 30) as days_count, 'below_55' as metric_type
        FROM consecutive_streaks WHERE consecutive_below_55 > 0
        UNION ALL
        SELECT LEAST(consecutive_above_55, 30), 'above_55'
        FROM consecutive_streaks WHERE consecutive_above_55 > 0
        UNION ALL
        SELECT LEAST(consecutive_with_water, 30), 'with_water'
        FROM consecutive_streaks WHERE consecutive_with_water > 0
        UNION ALL
        SELECT LEAST(consecutive_no_water, 30), 'no_water'
        FROM consecutive_streaks WHERE consecutive_no_water > 0
      )
      SELECT 
        gs.days,
        COALESCE(SUM(CASE WHEN dc.metric_type = 'below_55' AND dc.days_count >= gs.days THEN 1 ELSE 0 END), 0)::integer as below_55,
        COALESCE(SUM(CASE WHEN dc.metric_type = 'above_55' AND dc.days_count >= gs.days THEN 1 ELSE 0 END), 0)::integer as above_55,
        COALESCE(SUM(CASE WHEN dc.metric_type = 'with_water' AND dc.days_count >= gs.days THEN 1 ELSE 0 END), 0)::integer as with_water,
        COALESCE(SUM(CASE WHEN dc.metric_type = 'no_water' AND dc.days_count >= gs.days THEN 1 ELSE 0 END), 0)::integer as no_water
      FROM (SELECT generate_series(1, 30) as days) gs
      LEFT JOIN day_counts dc ON TRUE
      GROUP BY gs.days
      ORDER BY gs.days ASC
    `;

    const res = await client.query(query);
    console.log("=== DETAILED REGIONAL STATISTICS DAY-WISE BREAKDOWN ===");
    console.table(res.rows.filter(r => [1, 7, 10, 15, 20, 21, 22, 23, 24, 25, 26, 30].includes(Number(r.days))));

    // Now let's see how many villages have consecutive_no_water >= 20 and consecutive_below_55 >= 20
    const rawStreaksRes = await client.query(`
      WITH 
      deduplicated AS (
        SELECT DISTINCT ON (scheme_id, village_name, data_date)
          scheme_id,
          village_name,
          lpcd_value::numeric as lpcd_value,
          data_date,
          CASE 
            WHEN data_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN data_date::date
            WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(data_date, 'DD-Mon-YY')
            WHEN data_date ~ '^[0-9]+-[A-Za-z]+$' THEN 
              CASE
                WHEN TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY') > (COALESCE(uploaded_at, CURRENT_DATE) + interval '1 month')
                THEN TO_DATE(data_date || '-' || (TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY')::int - 1), 'DD-Mon-YYYY')
                ELSE TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY')
              END
            ELSE NULL 
          END as parsed_date
        FROM water_scheme_data_history wh
        WHERE data_date IS NOT NULL
        ORDER BY scheme_id, village_name, data_date, uploaded_at DESC NULLS LAST
      ),
      ranked AS (
        SELECT 
          scheme_id,
          village_name,
          lpcd_value,
          parsed_date,
          ROW_NUMBER() OVER (PARTITION BY scheme_id, village_name ORDER BY parsed_date DESC NULLS LAST) as rn,
          CASE WHEN lpcd_value > 0 AND lpcd_value < 55 THEN 1 ELSE 0 END as is_below_55,
          CASE WHEN lpcd_value >= 55 THEN 1 ELSE 0 END as is_above_55,
          CASE WHEN lpcd_value > 0 THEN 1 ELSE 0 END as has_water,
          CASE WHEN lpcd_value IS NULL OR lpcd_value = 0 THEN 1 ELSE 0 END as no_water
        FROM deduplicated
        WHERE parsed_date IS NOT NULL
      ),
      with_groups AS (
        SELECT 
          scheme_id,
          village_name,
          rn,
          is_below_55,
          is_above_55,
          has_water,
          no_water,
          rn - ROW_NUMBER() OVER (PARTITION BY scheme_id, village_name, is_below_55 ORDER BY rn) as grp_below_55,
          rn - ROW_NUMBER() OVER (PARTITION BY scheme_id, village_name, is_above_55 ORDER BY rn) as grp_above_55,
          rn - ROW_NUMBER() OVER (PARTITION BY scheme_id, village_name, has_water ORDER BY rn) as grp_with_water,
          rn - ROW_NUMBER() OVER (PARTITION BY scheme_id, village_name, no_water ORDER BY rn) as grp_no_water
        FROM ranked
        WHERE rn <= 30
      ),
      consecutive_streaks AS (
        SELECT 
          scheme_id,
          village_name,
          MAX(CASE WHEN is_below_55 = 1 AND rn = 1 THEN 
            (SELECT COUNT(*) FROM with_groups wg2 
             WHERE wg2.scheme_id = with_groups.scheme_id 
             AND wg2.village_name = with_groups.village_name 
             AND wg2.is_below_55 = 1 
             AND wg2.grp_below_55 = with_groups.grp_below_55)
          ELSE 0 END) as consecutive_below_55,
          MAX(CASE WHEN no_water = 1 AND rn = 1 THEN 
            (SELECT COUNT(*) FROM with_groups wg2 
             WHERE wg2.scheme_id = with_groups.scheme_id 
             AND wg2.village_name = with_groups.village_name 
             AND wg2.no_water = 1 
             AND wg2.grp_no_water = with_groups.grp_no_water)
          ELSE 0 END) as consecutive_no_water
        FROM with_groups
        GROUP BY scheme_id, village_name
      )
      SELECT 
        COUNT(CASE WHEN consecutive_below_55 >= 20 THEN 1 END) as below_55_ge_20,
        COUNT(CASE WHEN consecutive_no_water >= 20 THEN 1 END) as no_water_ge_20,
        COUNT(CASE WHEN consecutive_below_55 >= 20 OR consecutive_no_water >= 20 THEN 1 END) as either_ge_20
      FROM consecutive_streaks
    `);
    console.log("Streaks breakdown:", rawStreaksRes.rows[0]);

  } finally {
    client.release();
    pool.end();
  }
}

run();
