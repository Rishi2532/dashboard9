import { getDB } from '../server/db.ts';
import { sql } from 'drizzle-orm';
import { fetchWithRetry } from '../server/services/pi-web-api-service.ts';

async function check() {
  const db = await getDB();
  const res = await db.execute(sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'water_scheme_data' OR table_name = 'scheme_status';
  `);
  console.log('Columns in tables:');
  console.log(res.rows);

  const sample = await db.execute(sql`
    SELECT * FROM water_scheme_data WHERE lower(region) LIKE '%amravati%' LIMIT 2;
  `);
  console.log('Sample water_scheme_data:', sample.rows[0]);
}

check().catch(console.error);
