import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function inspectHistoryDetails() {
  const db = await getDB();

  console.log('--- Sample water_scheme_data_history ---');
  const lpcdSample = await db.execute(sql`
    SELECT * FROM water_scheme_data_history
    WHERE data_date IN ('18-Oct', '17-Oct', '16-Oct', '15-Oct', '14-Oct', '13-Oct', '12-Oct', '30-Sep')
    LIMIT 3;
  `);
  console.dir(lpcdSample.rows, { depth: null });

  console.log('--- Sample chlorine_history ---');
  const clSample = await db.execute(sql`
    SELECT * FROM chlorine_history
    WHERE chlorine_date IN ('18-Oct', '17-Oct', '16-Oct', '15-Oct', '14-Oct', '13-Oct', '12-Oct', '30-Sep')
    LIMIT 3;
  `);
  console.dir(clSample.rows, { depth: null });

  console.log('--- Sample pressure_history ---');
  const prSample = await db.execute(sql`
    SELECT * FROM pressure_history
    WHERE pressure_date IN ('18-Oct', '17-Oct', '16-Oct', '15-Oct', '14-Oct', '13-Oct', '12-Oct', '30-Sep')
    LIMIT 3;
  `);
  console.dir(prSample.rows, { depth: null });

  console.log('--- Sample water_consumption_history ---');
  const wcSample = await db.execute(sql`
    SELECT * FROM water_consumption_history
    WHERE data_date IN ('18-Oct', '17-Oct', '16-Oct', '15-Oct', '14-Oct', '13-Oct', '12-Oct', '30-Sep')
    LIMIT 3;
  `);
  console.dir(wcSample.rows, { depth: null });

  process.exit(0);
}

inspectHistoryDetails().catch(console.error);
