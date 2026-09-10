import { fetchWithRetry } from '../server/services/pi-web-api-service.ts';
import { getDB } from '../server/db.ts';
import { sql } from 'drizzle-orm';

async function checkSampleStarts() {
  const db = await getDB();
  const res = await db.execute(sql`
    SELECT DISTINCT ON (village_name) village_name, dashboard_url
    FROM water_scheme_data
    WHERE lower(region) LIKE '%amravati%'
    LIMIT 10;
  `);

  for (const row of res.rows as any[]) {
    let assetPath = '';
    const match = row.dashboard_url?.match(/asset=([^&]+)/);
    if (match) {
      assetPath = decodeURIComponent(match[1]);
      if (!assetPath.startsWith('\\\\')) assetPath = '\\\\' + assetPath.replace(/^\\+/, '');
    }
    if (!assetPath) continue;

    const elemRes = await fetchWithRetry(`/elements?path=${encodeURIComponent(assetPath)}`);
    const elemWebId = elemRes?.data?.WebId;
    if (!elemWebId) continue;

    const attrsRes = await fetchWithRetry(`/elements/${elemWebId}/attributes?nameFilter=*Water Consumption*`);
    const items = attrsRes?.data?.Items || [];
    const waterAttr = items.find((i: any) => i.Name.toLowerCase() === 'calc - water consumption per day') ||
      items.find((i: any) => i.Name.toLowerCase() === 'calc - water consumption per day with mbr') ||
      items[0];

    if (!waterAttr?.WebId) continue;

    const sumRes = await fetchWithRetry(`/streams/${waterAttr.WebId}/summary?startTime=2024-01-01&endTime=*&summaryType=Maximum&summaryDuration=1d`);
    const sumItems = sumRes?.data?.Items || [];

    const validItems = sumItems.filter((it: any) => {
      const pt = it?.Value;
      if (!pt || pt.Good === false) return false;
      if (typeof pt.Value === 'object' && (pt.Value.IsSystem || pt.Value.Name === 'Pt Created' || pt.Value.Name === 'Calc Failed' || pt.Value.Value === 'No Data')) {
        return false;
      }
      const num = typeof pt.Value === 'number' ? pt.Value : typeof pt === 'number' ? pt : null;
      return num !== null && !isNaN(num);
    });

    if (validItems.length > 0) {
      const firstTs = validItems[0].Value?.Timestamp || validItems[0].Timestamp;
      const lastTs = validItems[validItems.length - 1].Value?.Timestamp || validItems[validItems.length - 1].Timestamp;
      console.log(`Village: ${row.village_name.padEnd(20)} | Valid Points: ${String(validItems.length).padEnd(4)} | First Date: ${firstTs.slice(0, 10)} | Last Date: ${lastTs.slice(0, 10)}`);
    } else {
      console.log(`Village: ${row.village_name.padEnd(20)} | NO DATA (Not integrated / offline)`);
    }
  }
}

checkSampleStarts().catch(console.error);
