import { fetchWithRetry } from '../server/services/pi-web-api-service.ts';

async function testSingleESRStreamset() {
  const p = '\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-Amravati\\Circle-Akola\\Division-Akola\\Sub Division-Akola\\Block-Akola\\Scheme-20027951 - Khambora 60 VRRWSS Tq. & Dist. Akola\\Akhatwada\\Existing 0.20 LL ESR';
  console.log(`Getting element for path: ${p}`);
  const elemRes = await fetchWithRetry(`/elements?path=${encodeURIComponent(p)}`);
  const elem = elemRes?.data;
  console.log(`Element WebId: ${elem?.WebId}, Name: ${elem?.Name}`);
  
  const streamsetRes = await fetchWithRetry(`/streamsets/${elem?.WebId}/value`);
  const items = streamsetRes?.data?.Items || [];
  console.log(`Streamset items count: ${items.length}`);
  for (const item of items) {
    console.log(` • [${item.Name}] => Value: ${JSON.stringify(item.Value?.Value)} | Units: ${item.Value?.UnitsAbbreviation || ''} | Timestamp: ${item.Value?.Timestamp}`);
  }
}

testSingleESRStreamset().catch(console.error);
