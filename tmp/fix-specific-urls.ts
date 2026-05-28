import { getDB } from '../server/db';
import { generateDashboardUrl, generateVillageDashboardUrl } from '../server/auto-generate-dashboard-urls';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('🔧 Aggressive fix for URLs for scheme 7890965...');
  const db = await getDB();
  
  try {
    // 1. scheme_status
    console.log('Updating scheme_status...');
    const schemeResults = await db.execute(sql`SELECT * FROM scheme_status WHERE scheme_id = '7890965'`);
    for (const scheme of schemeResults.rows) {
      const dashboardUrl = generateDashboardUrl(scheme);
      if (!dashboardUrl) continue;
      console.log(`Updating scheme_status row for block ${scheme.block} -> ${dashboardUrl}`);
      
      const updateRes = await db.execute(sql`
        UPDATE scheme_status 
        SET dashboard_url = ${dashboardUrl} 
        WHERE scheme_id = ${scheme.scheme_id} 
        AND (block = ${scheme.block} OR (block IS NULL AND ${scheme.block} IS NULL))
      `);
      console.log(`Update result: ${updateRes.rowCount} rows affected`);
    }

    // 2. water_scheme_data
    console.log('Updating water_scheme_data villages...');
    const villageResults = await db.execute(sql`SELECT * FROM water_scheme_data WHERE scheme_id = '7890965'`);
    for (const village of villageResults.rows) {
      const dashboardUrl = generateVillageDashboardUrl(village);
      if (!dashboardUrl) continue;
      console.log(`Updating water_scheme_data row for ${village.village_name} (block: ${village.block}) -> ${dashboardUrl}`);
      
      const updateRes = await db.execute(sql`
        UPDATE water_scheme_data 
        SET dashboard_url = ${dashboardUrl} 
        WHERE scheme_id = ${village.scheme_id} 
        AND village_name = ${village.village_name}
        AND (block = ${village.block} OR (block IS NULL AND ${village.block} IS NULL))
      `);
      console.log(`Update result: ${updateRes.rowCount} rows affected`);
    }

    // Double check
    console.log('Verification check...');
    const check = await db.execute(sql`SELECT village_name, dashboard_url FROM water_scheme_data WHERE scheme_id = '7890965' AND village_name = 'Tolewahi'`);
    console.log('Final Tolewahi URL in DB:', check.rows[0]?.dashboard_url);

    console.log('✅ Targeted script finished!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Aggressive fix failed!');
    console.error('Error:', error.message);
    if (error.stack) console.error('Stack:', error.stack);
    process.exit(1);
  }
}

main();
