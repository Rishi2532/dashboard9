import { getDB } from '../server/db.ts';
import { sql } from 'drizzle-orm';
import { fetchWithRetry } from '../server/services/pi-web-api-service.ts';

async function testVillageWater() {
  const db = await getDB();
  const res = await db.execute(sql`
    SELECT scheme_id, village_name, dashboard_url, population, number_of_esr
    FROM water_scheme_data
    WHERE lower(region) LIKE '%amravati%'
    LIMIT 5
  `);

  for (const row of res.rows as any[]) {
    let assetPath = '';
    if (row.dashboard_url) {
      const match = row.dashboard_url.match(/asset=([^&]+)/);
      if (match) {
        assetPath = decodeURIComponent(match[1]);
        if (!assetPath.startsWith('\\\\')) {
          assetPath = '\\\\' + assetPath.replace(/^\\+/, '');
        }
      }
    }

    console.log(`\nTesting Village: ${row.scheme_id} - ${row.village_name}`);
    console.log(`Asset Path: ${assetPath}`);

    const elemRes = await fetchWithRetry(`/elements?path=${encodeURIComponent(assetPath)}`);
    const elemWebId = elemRes?.data?.WebId;
    console.log(`Element WebId: ${elemWebId}`);

    if (elemWebId) {
      const attrsRes = await fetchWithRetry(`/elements/${elemWebId}/attributes?nameFilter=*Water Consumption*`);
      const items = attrsRes?.data?.Items || [];
      console.log(`Matching Water Attributes:`, items.map((i: any) => i.Name));

      const waterAttr = items.find((i: any) => i.Name.toLowerCase().includes('for lpcd')) ||
        items.find((i: any) => i.Name.toLowerCase().includes('water consumption per day')) ||
        items[0];

      if (waterAttr) {
        console.log(`Using attribute: ${waterAttr.Name} (WebId: ${waterAttr.WebId})`);
        const sumRes = await fetchWithRetry(`/streams/${waterAttr.WebId}/summary?startTime=2024-01-01&endTime=*&summaryType=Maximum&summaryDuration=1d`);
        const sumItems = sumRes?.data?.Items || [];
        const validPoints = sumItems.filter((it: any) => {
          const pt = it?.Value;
          return pt && typeof pt.Value === 'number' && pt.Good !== false;
        });

        console.log(`Total days: ${sumItems.length}, Valid non-error days: ${validPoints.length}`);
        if (validPoints.length > 0) {
          console.log(`First valid date: ${validPoints[0].Value.Timestamp} (Value: ${validPoints[0].Value.Value} ${validPoints[0].Value.UnitsAbbreviation || ''})`);
          console.log(`Last valid date: ${validPoints[validPoints.length - 1].Value.Timestamp} (Value: ${validPoints[validPoints.length - 1].Value.Value})`);
        }
      }
    }
  }

  process.exit(0);
}

testVillageWater();
