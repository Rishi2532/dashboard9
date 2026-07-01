import { fetchWithRetry, extractHierarchyFromPath, getAllESRs } from '../server/services/pi-web-api-service.ts';

async function run() {
  console.log("Testing fast bulk ingest...");
  
  // Just get the first 5 ESRs to test the concept
  const allESRs = await getAllESRs();
  const testESRs = allESRs.slice(0, 5);
  
  // 1. Fetch the attribute WebIds for 'Chlorine' for these ESRs
  console.log("Fetching attribute WebIds...");
  const attrWebIds = [];
  
  for (const esr of testESRs) {
    const attrsRes = await fetchWithRetry(`/elements/${esr.WebId}/attributes?nameFilter=Chlorine`);
    if (attrsRes.data.Items && attrsRes.data.Items.length > 0) {
      attrWebIds.push({
        esrPath: esr.Path,
        attrWebId: attrsRes.data.Items[0].WebId
      });
    }
  }
  
  console.log("Found", attrWebIds.length, "Chlorine attributes.");
  
  // 2. Use streamsets/value to fetch ALL values in ONE request!
  if (attrWebIds.length > 0) {
    // Construct query string: ?webId=abc&webId=def&webId=ghi
    const queryStr = attrWebIds.map(a => `webId=${a.attrWebId}`).join('&');
    
    console.log("Calling /streamsets/value...");
    const streamSetRes = await fetchWithRetry(`/streamsets/value?${queryStr}`);
    
    console.log("StreamSet Result Items:");
    streamSetRes.data.Items.forEach((item: any, i: number) => {
      console.log(`\nESR: ${attrWebIds[i].esrPath}`);
      console.log(`Value:`, item.Value);
    });
  }
}

run().catch(console.error);
