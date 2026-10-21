import { getDB } from '../server/db.js';
import { sql } from 'drizzle-orm';

async function test() {
  const db = await getDB();
  const schemeId = '20003791';
  const dates = ['18-Oct', '17-Oct', '16-Oct', '15-Oct', '14-Oct', '13-Oct', '12-Oct'];
  const sqlDates = sql.join(dates.map(d => sql`${d}`), sql`, `);

  const res: any = await db.execute(sql`
    SELECT DISTINCT ON (data_date)
      data_date, village_name, lpcd_value
    FROM water_scheme_data_history
    WHERE scheme_id = ${schemeId}
      AND data_date IN (${sqlDates})
    ORDER BY data_date, uploaded_at DESC, id DESC
  `);
  console.log('Results for scheme', schemeId, ':', res.rows);
}

test().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
