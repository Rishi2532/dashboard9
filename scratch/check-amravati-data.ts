import { getDB } from '../server/db.ts';
import { sql } from 'drizzle-orm';
import { getAllESRs, fetchWithRetry } from '../server/services/pi-web-api-service.ts';

async function main() {
  try {
    const db = await getDB();
    const histRes = await db.execute(sql`SELECT count(*) as cnt, min(data_date) as min_d, max(data_date) as max_d FROM water_consumption_history WHERE lower(region) LIKE '%amravati%'`);
    console.log('Database water_consumption_history (Amravati):', histRes.rows);

    const datesRes = await db.execute(sql`SELECT DISTINCT data_date FROM water_consumption_history WHERE lower(region) LIKE '%amravati%' ORDER BY data_date`);
    console.log('Available dates in DB history:', datesRes.rows.map(r => r.data_date));

    // Also check PI Web API for Amravati ESRs
    const esrs = await getAllESRs('\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-Amravati');
    console.log(`PI Web API ESRs in Amravati: ${esrs.length}`);

    // Check one ESR in PI Web API for all recorded / summary water consumption
    if (esrs.length > 0) {
      const sampleESR = esrs[0];
      console.log('Sample ESR:', sampleESR.Path);
      
      const attrRes = await fetchWithRetry(`/elements/${sampleESR.WebId}/attributes?nameFilter=CALC - WATER CONSUMPTION PER DAY`);
      if (attrRes.data.Items && attrRes.data.Items.length > 0) {
        const attrWebId = attrRes.data.Items[0].WebId;
        // Check earliest recorded points
        const recRes = await fetchWithRetry(`/streams/${attrWebId}/recorded?startTime=2020-01-01T00:00:00Z&maxCount=10&boundaryType=Inside`);
        console.log('Earliest 10 recorded points:', recRes.data.Items);

        // Check summary from 2023 or 2024 to now
        const sumRes = await fetchWithRetry(`/streams/${attrWebId}/summary?startTime=2023-01-01&endTime=*&summaryType=Maximum&summaryDuration=1d`);
        console.log(`Summary points count from 2023: ${sumRes.data.Items ? sumRes.data.Items.length : 0}`);
        if (sumRes.data.Items && sumRes.data.Items.length > 0) {
          console.log('First summary item:', sumRes.data.Items[0]);
          console.log('Last summary item:', sumRes.data.Items[sumRes.data.Items.length - 1]);
        }
      }
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

main();
