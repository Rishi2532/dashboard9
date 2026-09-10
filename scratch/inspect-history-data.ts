import { getDB } from '../server/db.ts';
import { sql } from 'drizzle-orm';

async function checkRows() {
  const db = await getDB();
  const sample = await db.execute(sql`
    SELECT w.*, ss.agency_type 
    FROM water_consumption_history w
    LEFT JOIN scheme_status ss ON ss.scheme_id = w.scheme_id
    WHERE lower(w.region) LIKE '%amravati%'
    LIMIT 5
  `);
  console.log('Sample rows with agency_type:', JSON.stringify(sample.rows, null, 2));

  // Distinct dates ordered by actual timestamp / date
  const dates = await db.execute(sql`
    SELECT DISTINCT data_date, DATE(uploaded_at) as up_d
    FROM water_consumption_history
    WHERE lower(region) LIKE '%amravati%'
    ORDER BY up_d ASC, data_date ASC
  `);
  console.log('All available dates in Amravati history:', dates.rows);

  const totalESRs = await db.execute(sql`
    SELECT count(DISTINCT (scheme_id || '_' || village_name || '_' || esr_name)) as esr_cnt
    FROM water_consumption_history
    WHERE lower(region) LIKE '%amravati%'
  `);
  console.log('Total unique ESRs in Amravati history:', totalESRs.rows);

  process.exit(0);
}

checkRows();
