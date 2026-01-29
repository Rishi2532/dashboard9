
import { sql } from "drizzle-orm";
import { getDB } from "./server/db";
import { getFilteredSchemeIds } from "./server/routes/pressure-routes"; // Needs export or copy

// I might need to copy getFilteredSchemeIds if it's not exported. 
// I'll assume for now I can copy the logic or import if available. 
// Since I can't easily import non-exported functions, I'll copy the relevant parts of logic or modify route file to export it temporarily?
// Better: I'll create a script that IMPORTS the router and mimics a request? No, that's complex.
// I'll copy the logic.

async function runDebug() {
    const db = await getDB();
    const filterType = 'commissioned'; // common filter
    const fullyCompleted = undefined;
    const region = 'Amravati'; // Pick a region that likely has data
    const category = 'below_0_2';

    console.log(`Debugging for Region: ${region}, Filter: ${filterType}`);

    // LOGIC FROM /overall-region-comparison
    // -------------------------------------
    // Mock getFilteredSchemeIds
    // I'll verify what this returns first
    let schemeIdFilterRaw = "";
    
    // Quick and dirty query to get commissioned schemes to simulate getFilteredSchemeIds
    const schemeResult = await db.execute(sql`
        SELECT scheme_id FROM scheme_status 
        WHERE LOWER(implementation_status) = 'commissioned'
    `);
    const filteredIds = schemeResult.rows.map(r => r.scheme_id);
    console.log(`Found ${filteredIds.length} commissioned schemes.`);

    if (filteredIds.length > 0) {
        const ids = filteredIds.map((id) => `'${id}'`).join(',');
        schemeIdFilterRaw = `AND pd.scheme_id IN (${ids})`;
    } else {
        schemeIdFilterRaw = "AND 1=0";
    }

    // Main Overall Query (Simplified Logic)
    // We want to see count of below_0_2 for Amravati
    const overallQuery = sql.raw(`
      SELECT 
        COUNT(CASE WHEN pd.pressure_value_7 < 0.2 THEN 1 END) as below_0_2
      FROM pressure_data pd
      WHERE pd.region = '${region}' ${schemeIdFilterRaw}
    `);
    
    const overallRes = await db.execute(overallQuery);
    console.log("Overall Query Result:", overallRes.rows[0]);

    // LOGIC FROM /details/:category
    // -------------------------------------
    const schemeIdFilterSql = sql.raw(schemeIdFilterRaw); // Same logic
    const categoryCondition = sql`AND pd.pressure_value_7 IS NOT NULL AND pd.pressure_value_7 < 0.2`;
    
    const detailsQuery = sql`
      SELECT count(*) as count
      FROM pressure_data pd
      WHERE pd.region = ${region}
        ${categoryCondition}
        ${schemeIdFilterSql}
    `;
    
    const detailsRes = await db.execute(detailsQuery);
    console.log("Details Query Result:", detailsRes.rows[0]);
    
    process.exit(0);
}

runDebug().catch(console.error);
