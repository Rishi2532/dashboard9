import { fetchWithRetry, getAllESRs } from '../server/services/pi-web-api-service.ts';

async function run() {
  console.log("Fetching ESRs...");
  const esrs = await getAllESRs();
  console.log(`Found ${esrs.length} ESRs.`);
  
  for (let i = 0; i < 50; i++) {
    const esr = esrs[i];
    const attrsRes = await fetchWithRetry(`/elements/${esr.WebId}/attributes?nameFilter=Communication Status*`);
    if (attrsRes.data.Items && attrsRes.data.Items.length > 0) {
      console.log(`\nESR: ${esr.Path}`);
      for (const attr of attrsRes.data.Items) {
        try {
           const valRes = await fetchWithRetry(attr.Links.Value);
           console.log(`  - ${attr.Name}:`, valRes.data.Value);
        } catch(e) {
           console.log(`  - ${attr.Name}: Error fetching`);
        }
      }
      // Stop after finding a good one
      if (attrsRes.data.Items.length >= 3) {
          break;
      }
    }
  }
}

run().catch(console.error);
