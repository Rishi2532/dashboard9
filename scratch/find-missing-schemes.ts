import { getDB } from "../db";
import { schemeLpcd } from "@shared/schema";
import { findElementsByTemplate, extractHierarchyFromPath } from "../services/pi-web-api-service";

async function run() {
  try {
    const db = await getDB();
    const defaultPath = "\\\\DemoAF\\JJM\\JJM\\Maharashtra";
    const piSchemes = await findElementsByTemplate(defaultPath, "MJP Scheme Level - Active");
    
    const dbSchemes = await db.select({ scheme_id: schemeLpcd.scheme_id }).from(schemeLpcd);
    const dbSchemeIds = new Set(dbSchemes.map(s => s.scheme_id));
    
    console.log(`Total Schemes in PI: ${piSchemes.length}`);
    console.log(`Total Schemes in DB: ${dbSchemeIds.size}`);
    console.log("Missing Schemes:");
    
    for (const scheme of piSchemes) {
      const hierarchy = extractHierarchyFromPath(scheme.Path);
      if (hierarchy.scheme_id && !dbSchemeIds.has(hierarchy.scheme_id)) {
        console.log(`- Scheme ID: ${hierarchy.scheme_id} | Name: ${hierarchy.scheme_name} | PI Name: ${scheme.Name}`);
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
