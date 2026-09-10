import { getDB } from '../server/db.ts';
import { sql } from 'drizzle-orm';
import { fetchWithRetry } from '../server/services/pi-web-api-service.ts';

async function testFastHistory() {
  const db = await getDB();
  const esrRows = await db.execute(sql`
    SELECT DISTINCT ON (scheme_id, village_name, esr_name)
      region, circle, division, sub_division, block, scheme_id, scheme_name, village_name, esr_name, dashboard_url
    FROM water_consumption_history
    WHERE lower(region) LIKE '%amravati%' AND dashboard_url IS NOT NULL
    LIMIT 6
  `);

  for (const row of esrRows.rows as any[]) {
    const match = row.dashboard_url.match(/asset=([^&]+)/);
    if (!match) continue;
    const assetPath = decodeURIComponent(match[1]);

    console.log(`\n======================================================`);
    console.log(`Testing ESR: ${row.scheme_id} - ${row.village_name} - ${row.esr_name}`);

    const attrPath = `${assetPath}|CALC - WATER CONSUMPTION PER DAY`;
    try {
      const attrRes = await fetchWithRetry(`/attributes?path=${encodeURIComponent(attrPath)}`);
      const attrWebId = attrRes.data.WebId;

      // Query daily summary from 2024-01-01 to now
      const sumRes = await fetchWithRetry(`/streams/${attrWebId}/summary?startTime=2024-01-01&endTime=*&summaryType=Maximum&summaryDuration=1d`);
      const sumItems = sumRes?.data?.Items || [];

      const validItems = sumItems.filter((it: any) => {
        const v = it?.Value;
        if (!v) return false;
        if (typeof v === 'object') {
          if (v.IsSystem || v.Name === 'Pt Created' || v.Name === 'Calc Failed' || v.Value === 253 || v.Value === 255 || v.Value === 249) {
            return false;
          }
          if (typeof v.Value === 'number' && v.Good !== false) return true;
        }
        return typeof v === 'number';
      });

      console.log(`Total summary buckets: ${sumItems.length}, Valid numeric points: ${validItems.length}`);
      if (validItems.length > 0) {
        console.log(`First valid date: ${validItems[0].Value?.Timestamp || validItems[0].Timestamp} -> Value: ${validItems[0].Value?.Value ?? validItems[0].Value}`);
        console.log(`Last valid date: ${validItems[validItems.length - 1].Value?.Timestamp || validItems[validItems.length - 1].Timestamp} -> Value: ${validItems[validItems.length - 1].Value?.Value ?? validItems[validItems.length - 1].Value}`);
      }
    } catch (e: any) {
      console.error(`Error for ${row.esr_name}:`, e.message);
    }
  }

  process.exit(0);
}

testFastHistory().catch(err => {
  console.error(err);
  process.exit(1);
});
