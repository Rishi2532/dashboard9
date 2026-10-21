import { getDB } from '../server/db.js';
import { sql } from 'drizzle-orm';

async function check() {
  const db = await getDB();
  const res: any = await db.execute(sql`SELECT DISTINCT data_date FROM water_scheme_data_history ORDER BY data_date`);
  console.log('water_scheme_data_history dates:', res.rows.map((r: any) => r.data_date));
  const res2: any = await db.execute(sql`SELECT DISTINCT chlorine_date FROM chlorine_history ORDER BY chlorine_date`);
  console.log('chlorine_history dates:', res2.rows.map((r: any) => r.chlorine_date));
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
