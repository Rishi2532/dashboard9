import { getDB } from "../server/db";
import { sql } from "drizzle-orm";

async function run() {
  const db = await getDB();
  const isAll = true;
  const selectedRegion = "all";

  // Query 4: iotVillagesFullyRes
  const iotVillagesFullyRes: any = await db.execute(sql`
    SELECT DISTINCT ON (ws.scheme_id, LOWER(TRIM(ws.village_name)))
      ws.scheme_id, ws.scheme_name, ws.village_name, ws.region, ws.circle, ws.division, ws.sub_division, ws.block,
      ws.population, ws.lpcd_value_day7 as lpcd_value, 'Completed' as status
    FROM water_scheme_data ws
    JOIN village v ON v.scheme_id = ws.scheme_id AND LOWER(TRIM(v.village_name)) = LOWER(TRIM(ws.village_name))
    LEFT JOIN scheme_status ss ON ss.scheme_id = ws.scheme_id
    WHERE TRIM(LOWER(v.fully_completion_village_status)) IN ('completed', 'fully completed', 'fully_completed')
      ${isAll ? sql`` : sql`AND ws.region ILIKE ${`%${selectedRegion}%`}`}
    ORDER BY ws.scheme_id, LOWER(TRIM(ws.village_name))
  `);
  console.log("iotVillagesFullyRes length:", iotVillagesFullyRes.rows?.length);

  // But what is the total count in village table?
  const directVillage: any = await db.execute(sql`
    SELECT DISTINCT ON (v.scheme_id, LOWER(TRIM(v.village_name)))
      v.scheme_id, v.scheme_name, v.village_name, v.region, v.circle, v.division, v.sub_division, v.block,
      'Completed' as status
    FROM village v
    WHERE TRIM(LOWER(v.fully_completion_village_status)) IN ('completed', 'fully completed', 'fully_completed')
    ORDER BY v.scheme_id, LOWER(TRIM(v.village_name))
  `);
  console.log("directVillage length:", directVillage.rows?.length);

  // What is the canonical source for 1271?
  // Let's check where 1271 comes from in the whole project:
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
