import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const db = await getDB();
  const { calculateAllAlertStreaksFromHistory } = await import('../server/services/streak-engine');
  
  // We can fetch the records for each of the 255 villages over the 20 days
  const opSchemes: any = await db.execute(sql`SELECT scheme_id FROM scheme_status WHERE water_supply = 'Yes'`);
  const opIds: string[] = opSchemes.rows.map((r: any) => r.scheme_id);
  const formattedIds = opIds.map(id => `'${id}'`).join(',');

  const rawStreaksRes: any = await db.execute(sql.raw(`
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
        AND scheme_id IN (${formattedIds})
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
      COUNT(CASE WHEN consecutive_below_55 >= 20 THEN 1 END) as pure_below_55_20,
      COUNT(CASE WHEN consecutive_no_water >= 20 THEN 1 END) as pure_no_water_20
    FROM consecutive_streaks
  `));
  console.log("DetailedChlorinePage 20 days breakdown:", rawStreaksRes.rows[0]);
}

run();
