import { getDB } from '../server/db.js';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDB();
  const schemeId = '20003791';

  const clRows = await db.execute(sql`
    SELECT DISTINCT ON (c.chlorine_date)
      c.scheme_id, c.scheme_name, c.village_name, c.esr_name, c.chlorine_date, c.chlorine_value
    FROM chlorine_history c
    WHERE c.scheme_id = ${schemeId}
      AND c.chlorine_date IN ('18-Oct', '17-Oct', '16-Oct', '15-Oct', '14-Oct', '13-Oct', '12-Oct')
    ORDER BY c.chlorine_date, c.uploaded_at DESC, c.id DESC
  `);
  console.log('Sample Chlorine rows for scheme:', clRows.rows);

  const prRows = await db.execute(sql`
    SELECT DISTINCT ON (p.pressure_date)
      p.scheme_id, p.scheme_name, p.village_name, p.esr_name, p.pressure_date, p.pressure_value
    FROM pressure_history p
    WHERE p.scheme_id = ${schemeId}
      AND p.pressure_date IN ('18-Oct', '17-Oct', '16-Oct', '15-Oct', '14-Oct', '13-Oct', '12-Oct')
    ORDER BY p.pressure_date, p.uploaded_at DESC, p.id DESC
  `);
  console.log('Sample Pressure rows for scheme:', prRows.rows);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
