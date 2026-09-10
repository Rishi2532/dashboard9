import { getDB } from '../server/db.ts';
import { sql } from 'drizzle-orm';
import { fetchWithRetry } from '../server/services/pi-web-api-service.ts';
import { format } from 'date-fns';

async function testRecordedMapping() {
  const db = await getDB();
  const res = await db.execute(sql`
    SELECT scheme_id, village_name, dashboard_url
    FROM water_scheme_data
    WHERE lower(village_name) LIKE '%akhatwada%'
  `);

  const row: any = res.rows[0];
  const match = row.dashboard_url.match(/asset=([^&]+)/);
  let assetPath = decodeURIComponent(match[1]);
  if (!assetPath.startsWith('\\\\')) assetPath = '\\\\' + assetPath.replace(/^\\+/, '');

  const elemRes = await fetchWithRetry(`/elements?path=${encodeURIComponent(assetPath)}`);
  const elemWebId = elemRes.data.WebId;

  const attrsRes = await fetchWithRetry(`/elements/${elemWebId}/attributes?nameFilter=*Water Consumption*`);
  const waterAttr = attrsRes.data.Items.find((i: any) => i.Name.toLowerCase().includes('for lpcd')) || attrsRes.data.Items[0];

  console.log(`Using attribute: ${waterAttr.Name}`);

  // Fetch recorded data from 2024-01-01
  const recRes = await fetchWithRetry(`/streams/${waterAttr.WebId}/recorded?startTime=2024-01-01T00:00:00Z&endTime=*&maxCount=10000`);
  const items = recRes.data.Items || [];

  console.log(`Total recorded items: ${items.length}`);

  const dateMap = new Map<string, number>();

  for (const it of items) {
    if (it.Good === false) continue;
    if (typeof it.Value !== 'number') continue;

    // Use UTC date of the recorded timestamp
    const dateObj = new Date(it.Timestamp);
    // Format strictly in UTC YYYY-MM-DD
    const y = dateObj.getUTCFullYear();
    const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getUTCDate()).padStart(2, '0');
    const dateKey = `${y}-${m}-${d}`;

    dateMap.set(dateKey, parseFloat(it.Value.toFixed(2)));
  }

  // Check 28 Aug, 29 Aug, 30 Aug, 31 Aug, 01 Sep, 02 Sep, 03 Sep
  const testDates = [
    '2026-08-28',
    '2026-08-29',
    '2026-08-30',
    '2026-08-31',
    '2026-09-01',
    '2026-09-02',
    '2026-09-03'
  ];

  console.log('\n--- Date to Consumption Mapping for Akhatwada ---');
  testDates.forEach(dt => {
    console.log(`Date: ${dt} -> Value: ${dateMap.get(dt)} LL`);
  });

  process.exit(0);
}

testRecordedMapping().catch(err => {
  console.error(err);
  process.exit(1);
});
