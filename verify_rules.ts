
import { getDB } from './server/db.ts';
import { sql } from 'drizzle-orm';

async function verifyCounts() {
  const db = await getDB();
  const rules = [
    { name: 'Rule 1: All Schemes', sql: sql`TRIM(LOWER(fully_completion_scheme_status)) IN ('fully completed', 'completed', 'in progress')` },
    { name: 'Rule 2: 100% Civil Work Completed', sql: sql`TRIM(LOWER(water_supply)) = 'yes'` },
    { name: 'Rule 3: Fully Instrumented Schemes', sql: sql`TRIM(LOWER(fully_completion_scheme_status)) IN ('fully completed', 'completed')` },
    { name: 'Rule 4: Partially Instrumented Schemes (IoT)', sql: sql`TRIM(LOWER(fully_completion_scheme_status)) = 'in progress'` },
    { name: 'Rule 5: Common (MJP + IoT)', sql: sql`TRIM(LOWER(fully_completion_scheme_status)) IN ('fully completed', 'completed') AND TRIM(LOWER(water_supply)) = 'yes'` },
    { name: 'Rule 6: Commissioned Schemes', sql: sql`TRIM(LOWER(mjp_commissioned)) = 'yes'` }
  ];

  console.log('--- Verification Results ---');
  for (const rule of rules) {
    const query = sql`SELECT COUNT(DISTINCT scheme_id) as count FROM scheme_status WHERE ${rule.sql}`;
    const res = await db.execute(query);
    console.log(`${rule.name}: ${res.rows[0].count}`);
  }
  
  const totalDistinct = await db.execute(sql`SELECT COUNT(DISTINCT scheme_id) as count FROM scheme_status`);
  console.log(`Total Distinct scheme_id in scheme_status: ${totalDistinct.rows[0].count}`);
  
  const totalRows = await db.execute(sql`SELECT COUNT(*) as count FROM scheme_status`);
  console.log(`Total Rows in scheme_status: ${totalRows.rows[0].count}`);
}

verifyCounts().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
