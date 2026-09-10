import { getDB } from '../server/db.ts';
import { sql } from 'drizzle-orm';

async function checkUnits() {
  const db = await getDB();
  const nonZero = await db.execute(sql`
    SELECT region, scheme_id, village_name, esr_name, esr_capacity, data_date, water_value, flow_rate_m3
    FROM water_consumption_history
    WHERE lower(region) LIKE '%amravati%' AND CAST(water_value AS numeric) > 0
    LIMIT 20
  `);
  console.log('Non-zero water_value rows in Amravati:');
  console.log(JSON.stringify(nonZero.rows, null, 2));

  // Check scheme_status to see where agency_type comes from
  const schemeTypes = await db.execute(sql`
    SELECT scheme_id, agency_type, region, circle, division, sub_division, block, scheme_name
    FROM scheme_status
    LIMIT 10
  `);
  console.log('Sample scheme_status rows:');
  console.log(JSON.stringify(schemeTypes.rows, null, 2));

  process.exit(0);
}

checkUnits();
