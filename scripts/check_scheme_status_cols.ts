import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function checkSchemeStatusCols() {
  const db = await getDB();
  const cols = await db.execute(sql`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'scheme_status'
    ORDER BY ordinal_position;
  `);
  console.log(cols.rows.map(r => r.column_name).join(', '));

  const sample = await db.execute(sql`
    SELECT 
      scheme_id, scheme_name, region, water_supply, 
      fully_completion_scheme_status, 
      total_villages_integrated, total_esr_integrated, no_fully_completed_esr
    FROM scheme_status LIMIT 5;
  `);
  console.log(sample.rows);
  process.exit(0);
}

checkSchemeStatusCols().catch(console.error);
