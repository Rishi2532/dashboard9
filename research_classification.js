import { getDB } from './server/db.ts';
import { sql } from 'drizzle-orm';

async function research() {
  const db = await getDB();
  
  const statusRes = await db.execute(sql`SELECT DISTINCT fully_completion_scheme_status FROM scheme_status`);
  console.log('Unique fully_completion_scheme_status:', statusRes.rows.map(r => r.fully_completion_scheme_status));
  
  const waterSupplyRes = await db.execute(sql`SELECT DISTINCT water_supply FROM scheme_status`);
  console.log('Unique water_supply:', waterSupplyRes.rows.map(r => r.water_supply));
  
  const mjpRes = await db.execute(sql`SELECT DISTINCT mjp_commissioned FROM scheme_status`);
  console.log('Unique mjp_commissioned:', mjpRes.rows.map(r => r.mjp_commissioned));
  
  const totalCount = await db.execute(sql`SELECT COUNT(DISTINCT scheme_id) FROM scheme_status`);
  console.log('Total Unique Scheme IDs in scheme_status:', totalCount.rows[0].count);
  
  const allSchemesCount = await db.execute(sql`
    SELECT COUNT(DISTINCT scheme_id) FROM scheme_status 
    WHERE TRIM(LOWER(fully_completion_scheme_status)) IN ('fully completed', 'completed', 'in progress')
  `);
  console.log('Count for "All Schemes" (Rule 1):', allSchemesCount.rows[0].count);

  const rule2Count = await db.execute(sql`
    SELECT COUNT(DISTINCT scheme_id) FROM scheme_status 
    WHERE TRIM(LOWER(water_supply)) = 'yes'
  `);
  console.log('Count for "100% Civil Work Completed" (Rule 2):', rule2Count.rows[0].count);

  const rule3Count = await db.execute(sql`
    SELECT COUNT(DISTINCT scheme_id) FROM scheme_status 
    WHERE TRIM(LOWER(fully_completion_scheme_status)) IN ('fully completed', 'completed')
  `);
  console.log('Count for "Fully Instrumented Schemes" (Rule 3):', rule3Count.rows[0].count);

  const rule4Count = await db.execute(sql`
    SELECT COUNT(DISTINCT scheme_id) FROM scheme_status 
    WHERE TRIM(LOWER(fully_completion_scheme_status)) = 'in progress'
  `);
  console.log('Count for "Partially Instrumented Schemes" (Rule 4):', rule4Count.rows[0].count);

  const rule5Count = await db.execute(sql`
    SELECT COUNT(DISTINCT scheme_id) FROM scheme_status 
    WHERE TRIM(LOWER(fully_completion_scheme_status)) IN ('fully completed', 'completed')
    AND TRIM(LOWER(water_supply)) = 'yes'
  `);
  console.log('Count for "Common (MJP + IoT)" (Rule 5):', rule5Count.rows[0].count);

  const rule6Count = await db.execute(sql`
    SELECT COUNT(DISTINCT scheme_id) FROM scheme_status 
    WHERE TRIM(LOWER(mjp_commissioned)) = 'yes'
  `);
  console.log('Count for "Commissioned Schemes" (Rule 6):', rule6Count.rows[0].count);
}

research().catch(console.error);
