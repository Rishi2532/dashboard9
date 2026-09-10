import { getDB } from '../server/db.ts';
import { sql } from 'drizzle-orm';
import { fetchWithRetry } from '../server/services/pi-web-api-service.ts';

async function testResilientAttr() {
  const db = await getDB();
  const dbRows = await db.execute(sql`
    SELECT 
      scheme_id, village_name, esr_name, dashboard_url
    FROM (
      SELECT DISTINCT ON (scheme_id, village_name, esr_name)
        scheme_id, village_name, esr_name, dashboard_url
      FROM water_consumption_history
      WHERE lower(region) LIKE '%amravati%'
    ) w
    LIMIT 10
  `);

  for (const row of dbRows.rows as any[]) {
    const match = row.dashboard_url ? row.dashboard_url.match(/asset=([^&]+)/) : null;
    const assetPath = match ? decodeURIComponent(match[1]) : '';
    console.log(`\nTesting: ${row.scheme_id} - ${row.village_name} - ${row.esr_name}`);

    // Fetch element
    const elemRes = await fetchWithRetry(`/elements?path=${encodeURIComponent(assetPath)}`);
    const elemWebId = elemRes?.data?.WebId;
    if (!elemWebId) {
      console.log('Element not found');
      continue;
    }

    // Search attributes
    const attrsRes = await fetchWithRetry(`/elements/${elemWebId}/attributes?nameFilter=*Water Consumption*`);
    const items = attrsRes?.data?.Items || [];
    console.log(`Matching attributes found: ${items.map((i: any) => i.Name).join(', ')}`);

    const waterAttr = items.find((i: any) => i.Name.toLowerCase() === 'calc - water consumption per day') || items[0];
    if (waterAttr) {
      console.log(`Using attribute: ${waterAttr.Name} (WebId: ${waterAttr.WebId})`);
      const sumRes = await fetchWithRetry(`/streams/${waterAttr.WebId}/summary?startTime=2024-01-01&endTime=*&summaryType=Maximum&summaryDuration=1d`);
      const sumItems = sumRes?.data?.Items || [];
      const nonZero = sumItems.filter((it: any) => it.Value && typeof it.Value.Value === 'number' && it.Value.Value > 0);
      console.log(`Total summary days: ${sumItems.length}, Non-zero days: ${nonZero.length}`);
      if (nonZero.length > 0) {
        console.log(`First non-zero: ${nonZero[0].Value.Timestamp} (${nonZero[0].Value.Value})`);
        console.log(`Last non-zero: ${nonZero[nonZero.length - 1].Value.Timestamp} (${nonZero[nonZero.length - 1].Value.Value})`);
      }
    }
  }

  process.exit(0);
}

testResilientAttr();
