import { getAllESRs, fetchWithRetry, extractHierarchyFromPath } from '../server/services/pi-web-api-service.ts';

async function testFullHistory() {
  console.log('Testing PI Web API full historical depth for Amravati...');
  const esrs = await getAllESRs('\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-Amravati');
  console.log(`Total ESRs found in Amravati via PI Web API: ${esrs.length}`);

  if (esrs.length === 0) {
    console.log('No ESRs found.');
    process.exit(1);
  }

  // Let's inspect 5 sample ESRs across different schemes/villages
  const sampleIndices = [0, Math.floor(esrs.length * 0.25), Math.floor(esrs.length * 0.5), Math.floor(esrs.length * 0.75), esrs.length - 1];

  for (const idx of sampleIndices) {
    const esr = esrs[idx];
    console.log(`\n========================================`);
    console.log(`[${idx}] ESR Path: ${esr.Path}`);

    // Get attributes
    const attrsRes = await fetchWithRetry(`/elements/${esr.WebId}/attributes?nameFilter=CALC - WATER CONSUMPTION PER DAY`);
    if (!attrsRes.data.Items || attrsRes.data.Items.length === 0) {
      console.log('No CALC - WATER CONSUMPTION PER DAY attribute found.');
      continue;
    }

    const attr = attrsRes.data.Items[0];
    const attrWebId = attr.WebId;

    // Check earliest recorded points
    const recRes = await fetchWithRetry(`/streams/${attrWebId}/recorded?startTime=2020-01-01T00:00:00Z&maxCount=10&boundaryType=Inside`);
    const recItems = recRes?.data?.Items || [];
    console.log(`Earliest recorded points count: ${recItems.length}`);
    if (recItems.length > 0) {
      console.log('First recorded point:', recItems[0]);
      if (recItems.length > 1) {
        console.log('Second recorded point:', recItems[1]);
      }
    }

    // Query 1-day summary from 2023-01-01 to now
    const sumRes = await fetchWithRetry(`/streams/${attrWebId}/summary?startTime=2023-01-01&endTime=*&summaryType=Maximum&summaryDuration=1d`);
    const sumItems = sumRes?.data?.Items || [];
    console.log(`Daily summary points from 2023-01-01 to now: ${sumItems.length}`);

    // Filter out bad / Pt Created values to see valid data range
    const validPoints = sumItems.filter((item: any) => {
      const v = item.Value;
      if (!v) return false;
      const isBad = v.IsSystem || v.Name === 'Pt Created' || v.Value === 253 || v.Value === 255 ||
        (typeof v.Value === 'object' && (v.Value.IsSystem || v.Value.Name === 'Pt Created'));
      return !isBad && typeof v.Value === 'number' && v.Good !== false;
    });

    console.log(`Valid numeric daily consumption points: ${validPoints.length}`);
    if (validPoints.length > 0) {
      console.log(`Earliest valid data date: ${validPoints[0].Value.Timestamp} -> Value: ${validPoints[0].Value.Value}`);
      console.log(`Latest valid data date: ${validPoints[validPoints.length - 1].Value.Timestamp} -> Value: ${validPoints[validPoints.length - 1].Value.Value}`);
    }
  }

  process.exit(0);
}

testFullHistory().catch(err => {
  console.error(err);
  process.exit(1);
});
