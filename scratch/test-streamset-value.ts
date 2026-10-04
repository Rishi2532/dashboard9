import { fetchWithRetry, getAllESRs } from '../server/services/pi-web-api-service.ts';

async function testStreamsetValue() {
  const esrs = await getAllESRs();
  console.log(`Loaded ${esrs.length} ESRs.`);
  if (esrs.length > 0) {
    const sample = esrs[0];
    console.log(`Testing streamset for ${sample.Name} (${sample.WebId})...`);
    const res = await fetchWithRetry(`/streamsets/${sample.WebId}/value`);
    const items = res?.data?.Items || [];
    console.log(`Streamset returned ${items.length} items:`);
    for (const item of items) {
      const lower = item.Name.toLowerCase();
      if (lower.includes('chlorine') || lower.includes('pressure') || lower.includes('flow') || lower.includes('comm')) {
        console.log(` - ${item.Name}:`, item.Value);
      }
    }
  }
}

testStreamsetValue().catch(console.error);
