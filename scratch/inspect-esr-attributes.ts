import { fetchWithRetry, getAllESRs } from '../server/services/pi-web-api-service.ts';

async function inspectESRAttributes() {
  console.log('Fetching sample ESRs from PI AF...');
  const esrs = await getAllESRs();
  console.log(`Found ${esrs.length} ESRs.`);

  if (esrs.length === 0) {
    console.log('No ESRs found.');
    return;
  }

  // Check 3 sample ESRs
  const samples = esrs.slice(0, 3);
  for (const esr of samples) {
    console.log(`\n========================================`);
    console.log(`ESR Name: ${esr.Name}`);
    console.log(`Template: ${esr.TemplateName}`);
    console.log(`Path: ${esr.Path}`);

    const attrsRes = await fetchWithRetry(`/elements/${esr.WebId}/attributes?maxCount=1000`);
    const attrs = attrsRes?.data?.Items || [];
    console.log(`Total Attributes found: ${attrs.length}`);

    console.log(`\n--- All Attributes ---`);
    for (const attr of attrs) {
      console.log(` • ${attr.Name} (Type: ${attr.Type || 'Unknown'}, WebId: ${attr.WebId})`);
    }

    // Also check current values for key attributes
    console.log(`\n--- Sample Current Values for Key Attributes ---`);
    const searchKeys = ['chlorine', 'pressure', 'flow', 'rate', 'water', 'realtime', 'calc'];
    for (const attr of attrs) {
      const lower = attr.Name.toLowerCase();
      if (searchKeys.some(k => lower.includes(k))) {
        try {
          const valRes = await fetchWithRetry(`/streams/${attr.WebId}/value`);
          const val = valRes?.data;
          console.log(`   ► ${attr.Name} => Value: ${JSON.stringify(val?.Value)} | Timestamp: ${val?.Timestamp} | Good: ${val?.Good}`);
        } catch (e: any) {
          console.log(`   ► ${attr.Name} => Error reading value: ${e.message}`);
        }
      }
    }
  }
}

inspectESRAttributes().catch(console.error);
