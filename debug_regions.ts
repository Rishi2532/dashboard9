
import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function checkRegions() {
  console.log("Checking distinct regions in tables...");

  try {
    const csRegions = await db.execute(sql`SELECT DISTINCT region FROM communication_status ORDER BY region`);
    console.log("\n--- communication_status regions ---");
    csRegions.rows.forEach(r => console.log(`'${r.region}'`));

    const phRegions = await db.execute(sql`SELECT DISTINCT region FROM pressure_history ORDER BY region`);
    console.log("\n--- pressure_history regions ---");
    phRegions.rows.forEach(r => console.log(`'${r.region}'`));

    const chRegions = await db.execute(sql`SELECT DISTINCT region FROM chlorine_history ORDER BY region`);
    console.log("\n--- chlorine_history regions ---");
    chRegions.rows.forEach(r => console.log(`'${r.region}'`));

    console.log("\n--- Checking specific 'Aurangabad' variants ---");
    const aurCheck = await db.execute(sql`
      SELECT 'communication_status' as table_name, count(*) as count FROM communication_status WHERE region ILIKE '%Aurangabad%'
      UNION ALL
      SELECT 'pressure_history' as table_name, count(*) as count FROM pressure_history WHERE region ILIKE '%Aurangabad%'
      UNION ALL
      SELECT 'chlorine_history' as table_name, count(*) as count FROM chlorine_history WHERE region ILIKE '%Aurangabad%'
    `);
    console.table(aurCheck.rows);

     console.log("\n--- Checking specific 'Chhatrapati' variants ---");
    const chatCheck = await db.execute(sql`
      SELECT 'communication_status' as table_name, count(*) as count FROM communication_status WHERE region ILIKE '%Chhatrapati%'
      UNION ALL
      SELECT 'pressure_history' as table_name, count(*) as count FROM pressure_history WHERE region ILIKE '%Chhatrapati%'
      UNION ALL
      SELECT 'chlorine_history' as table_name, count(*) as count FROM chlorine_history WHERE region ILIKE '%Chhatrapati%'
    `);
    console.table(chatCheck.rows);

  } catch (error) {
    console.error("Error:", error);
  }
  process.exit(0);
}

checkRegions();
