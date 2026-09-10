import { getDB } from '../server/db.ts';
import { sql } from 'drizzle-orm';
import { fetchWithRetry } from '../server/services/pi-web-api-service.ts';

async function inspectAkhatwada() {
  const db = await getDB();
  const res = await db.execute(sql`
    SELECT scheme_id, village_name, dashboard_url
    FROM water_scheme_data
    WHERE lower(village_name) LIKE '%akhatwada%'
  `);
  console.log('Village row in DB:', res.rows);

  if (res.rows.length === 0) return;

  const row: any = res.rows[0];
  const match = row.dashboard_url.match(/asset=([^&]+)/);
  let assetPath = decodeURIComponent(match[1]);
  if (!assetPath.startsWith('\\\\')) assetPath = '\\\\' + assetPath.replace(/^\\+/, '');

  console.log('Asset Path:', assetPath);

  const elemRes = await fetchWithRetry(`/elements?path=${encodeURIComponent(assetPath)}`);
  const elemWebId = elemRes.data.WebId;

  const attrsRes = await fetchWithRetry(`/elements/${elemWebId}/attributes?nameFilter=*Water Consumption*`);
  console.log('Attributes:', attrsRes.data.Items.map((a: any) => ({ Name: a.Name, WebId: a.WebId })));

  for (const attr of attrsRes.data.Items) {
    console.log(`\n======================================================`);
    console.log(`Attribute: ${attr.Name}`);

    // 1. Check Recorded points from 2026-08-25 to 2026-09-04
    const recRes = await fetchWithRetry(`/streams/${attr.WebId}/recorded?startTime=2026-08-25T00:00:00Z&endTime=2026-09-04T23:59:59Z`);
    console.log(`Recorded points (${recRes.data.Items?.length || 0}):`);
    recRes.data.Items?.forEach((it: any) => {
      console.log(`  Recorded: TS=${it.Timestamp} (Local: ${new Date(it.Timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}) -> Value=${typeof it.Value === 'object' ? JSON.stringify(it.Value) : it.Value}, Good=${it.Good}`);
    });

    // 2. Check Summary points from 2026-08-25 to 2026-09-04 with Maximum
    const sumMaxRes = await fetchWithRetry(`/streams/${attr.WebId}/summary?startTime=2026-08-25&endTime=2026-09-04&summaryType=Maximum&summaryDuration=1d`);
    console.log(`Summary Maximum points (${sumMaxRes.data.Items?.length || 0}):`);
    sumMaxRes.data.Items?.forEach((it: any) => {
      console.log(`  Summary Max: TS=${it.Value?.Timestamp} -> Value=${it.Value?.Value}`);
    });

    // 3. Check Summary points with Total or TotalPerDay
    const sumTotRes = await fetchWithRetry(`/streams/${attr.WebId}/summary?startTime=2026-08-25&endTime=2026-09-04&summaryType=Total&summaryDuration=1d`);
    console.log(`Summary Total points (${sumTotRes.data.Items?.length || 0}):`);
    sumTotRes.data.Items?.forEach((it: any) => {
      console.log(`  Summary Total: TS=${it.Value?.Timestamp} -> Value=${it.Value?.Value}`);
    });
  }

  // Also check ESR level in Akhatwada
  const esrRows = await db.execute(sql`
    SELECT scheme_id, village_name, esr_name, dashboard_url
    FROM water_consumption
    WHERE lower(village_name) LIKE '%akhatwada%'
  `);
  console.log('\n======================================================');
  console.log('ESR level rows in DB for Akhatwada:', esrRows.rows);

  process.exit(0);
}

inspectAkhatwada().catch(err => {
  console.error(err);
  process.exit(1);
});
