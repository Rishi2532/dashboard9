import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDB();
  const res = await db.execute(sql.raw(`
    SELECT 
      COUNT(DISTINCT scheme_id) as total, 
      COUNT(DISTINCT scheme_id) FILTER (WHERE water_supply = 'Yes') as operational 
    FROM scheme_status 
    WHERE fully_completion_scheme_status IN ('Fully Completed', 'Completed')
  `));
  console.log('--- OPERATIONAL LOGIC ---');
  console.log(`Total Schemes (Fully Completed): ${res.rows[0].total}`);
  console.log(`Operational Schemes (Water Supply = Yes): ${res.rows[0].operational}`);
  console.log(`Partial Schemes: ${Number(res.rows[0].total) - Number(res.rows[0].operational)}`);
}

main().catch(console.error);
