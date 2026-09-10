import { getDB } from '../server/db.ts';
import { sql } from 'drizzle-orm';
import { fetchWithRetry } from '../server/services/pi-web-api-service.ts';

async function checkSummaryStructure() {
  const db = await getDB();
  const esrRows = await db.execute(sql`
    SELECT scheme_id, village_name, esr_name, dashboard_url
    FROM water_consumption_history
    WHERE lower(region) LIKE '%amravati%' AND dashboard_url IS NOT NULL AND CAST(water_value AS numeric) > 0
    LIMIT 3
  `);

  for (const row of esrRows.rows as any[]) {
    const match = row.dashboard_url.match(/asset=([^&]+)/);
    if (!match) continue;
    const assetPath = decodeURIComponent(match[1]);
    const attrPath = `${assetPath}|CALC - WATER CONSUMPTION PER DAY`;

    console.log(`\nTesting ESR with known data: ${row.scheme_id} - ${row.village_name} - ${row.esr_name}`);
    const attrRes = await fetchWithRetry(`/attributes?path=${encodeURIComponent(attrPath)}`);
    const attrWebId = attrRes.data.WebId;

    // Summary from 2024-01-01
    const sumRes = await fetchWithRetry(`/streams/${attrWebId}/summary?startTime=2024-01-01&endTime=*&summaryType=Maximum&summaryDuration=1d`);
    const items = sumRes.data.Items || [];
    console.log(`Total summary items count: ${items.length}`);
    
    // Find all valid non-zero items
    const nonZeroItems = items.filter((it: any) => {
      const v = it?.Value;
      if (!v) return false;
      if (typeof v.Value === 'number' && v.Value > 0) return true;
      if (typeof v === 'number' && v > 0) return true;
      return false;
    });

    console.log(`Non-zero valid items count: ${nonZeroItems.length}`);
    if (nonZeroItems.length > 0) {
      console.log('First 3 non-zero items:', nonZeroItems.slice(0, 3));
      console.log('Last 3 non-zero items:', nonZeroItems.slice(-3));
    } else {
      console.log('Sample 3 items:', items.slice(0, 3));
    }
  }

  process.exit(0);
}

checkSummaryStructure().catch(err => {
  console.error(err);
  process.exit(1);
});
