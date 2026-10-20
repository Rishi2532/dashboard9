import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function verifyPreAggregatedColumns() {
  const db = await getDB();

  const q = await db.execute(sql`
    SELECT 
      COUNT(*) as total_rows,
      COUNT(CASE WHEN pd.number_of_consistent_zero_value_in_pressure = 7 THEN 1 END) as consistent_zero_col_7,
      COUNT(CASE WHEN (
        pd.pressure_value_1::numeric > 0 AND pd.pressure_value_1::numeric < 0.2 AND
        pd.pressure_value_2::numeric > 0 AND pd.pressure_value_2::numeric < 0.2 AND
        pd.pressure_value_3::numeric > 0 AND pd.pressure_value_3::numeric < 0.2 AND
        pd.pressure_value_4::numeric > 0 AND pd.pressure_value_4::numeric < 0.2 AND
        pd.pressure_value_5::numeric > 0 AND pd.pressure_value_5::numeric < 0.2 AND
        pd.pressure_value_6::numeric > 0 AND pd.pressure_value_6::numeric < 0.2 AND
        pd.pressure_value_7::numeric > 0 AND pd.pressure_value_7::numeric < 0.2
      ) THEN 1 END) as consistent_below_range
    FROM pressure_data pd
    JOIN communication_status cs ON (
      pd.scheme_id = cs.scheme_id AND
      LOWER(TRIM(pd.village_name)) = LOWER(TRIM(cs.village_name)) AND
      LOWER(TRIM(pd.esr_name)) = LOWER(TRIM(cs.esr_name))
    )
    JOIN water_consumption wc ON (
      pd.scheme_id = wc.scheme_id AND
      LOWER(TRIM(pd.village_name)) = LOWER(TRIM(wc.village_name)) AND
      LOWER(TRIM(pd.esr_name)) = LOWER(TRIM(wc.esr_name))
    )
    JOIN scheme_status ss ON ss.scheme_id = pd.scheme_id AND ss.water_supply = 'Yes'
    WHERE (cs.pressure_connected = 'Connected' OR cs.pressure_connected = 'connected')
      AND (cs.pressure_status = 'Online' OR cs.pressure_status = 'online')
      AND wc.water_value_day7 IS NOT NULL 
      AND wc.water_value_day7 > 0
  `);

  console.log('Result for Sensors with Water in 39 Schemes:');
  console.log(q.rows[0]);

  process.exit(0);
}

verifyPreAggregatedColumns().catch(console.error);
