
import { getDB } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    const db = await getDB();

    // 1. Unique Schemes in scheme_status
    const schemeStatusResult = await db.execute(sql`
      SELECT COUNT(DISTINCT scheme_id) as count FROM scheme_status
    `);
    const schemeStatusCount = schemeStatusResult.rows[0].count;

    // 2. Unique Schemes in scheme_lpcd
    const schemeLpcdResult = await db.execute(sql`
      SELECT COUNT(DISTINCT scheme_id) as count FROM scheme_lpcd
    `);
    const schemeLpcdCount = schemeLpcdResult.rows[0].count;

    // 3. Commissioned Schemes (water_supply = 'Yes')
    const commissionedResult = await db.execute(sql`
      SELECT COUNT(DISTINCT scheme_id) as count FROM scheme_status WHERE water_supply = 'Yes'
    `);
    const commissionedCount = commissionedResult.rows[0].count;

    // 4. Commissioned Schemes with LPCD data
    const commissionedLpcdResult = await db.execute(sql`
      SELECT COUNT(DISTINCT sl.scheme_id) as count 
      FROM scheme_lpcd sl
      JOIN scheme_status ss ON sl.scheme_id = ss.scheme_id AND sl.block = ss.block
      WHERE ss.water_supply = 'Yes'
    `);
    const commissionedLpcdCount = commissionedLpcdResult.rows[0].count;

    console.log(JSON.stringify({
      totalUniqueSchemesInStatus: schemeStatusCount,
      totalUniqueSchemesInLpcd: schemeLpcdCount,
      commissionedInStatus: commissionedCount,
      commissionedWithLpcdData: commissionedLpcdCount
    }, null, 2));

    process.exit(0);
  } catch (error) {
    console.error("Error fetching counts:", error);
    process.exit(1);
  }
}

main();
