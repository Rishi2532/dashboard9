import { fetchWithRetry } from '../server/services/pi-web-api-service.ts';

async function testTargetedESR() {
  // Let's test a few specific ESR paths across different templates (Standard ESR, MBR, etc.)
  const paths = [
    '\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-Amravati\\Circle-Akola\\Division-Akola\\Sub Division-Akola\\Block-Akola\\Scheme-20027951 - Khambora 60 VRRWSS Tq. & Dist. Akola\\Akhatwada\\Existing 0.20 LL ESR',
    '\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-Amravati\\Circle-Akola\\Division-Akola\\Sub Division-Akola\\Block-Akola\\Scheme-20027951 - Khambora 60 VRRWSS Tq. & Dist. Akola\\Mathodi\\Existing 0.20 LL ESR',
    '\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-Amravati\\Circle-Akola\\Division-Akola\\Sub Division-Akola\\Block-Akola\\Scheme-20027951 - Khambora 60 VRRWSS Tq. & Dist. Akola\\Khambora Head Work\\MBR 1'
  ];

  for (const p of paths) {
    console.log(`\n========================================`);
    console.log(`Path: ${p}`);
    const elemRes = await fetchWithRetry(`/elements?path=${encodeURIComponent(p)}`);
    const elem = elemRes?.data;
    if (!elem) {
      console.log('Element not found.');
      continue;
    }
    console.log(`Element Name: ${elem.Name} | Template: ${elem.TemplateName}`);

    const attrsRes = await fetchWithRetry(`/elements/${elem.WebId}/attributes?maxCount=1000`);
    const attrs = attrsRes?.data?.Items || [];
    console.log(`Found ${attrs.length} attributes:`);

    for (const a of attrs) {
      console.log(` • [${a.Name}] (Type: ${a.Type})`);
    }

    console.log(`\n--- Reading Current Values for Flow Rate, Chlorine, Pressure ---`);
    for (const a of attrs) {
      const lower = a.Name.toLowerCase();
      if (lower.includes('flow') || lower.includes('rate') || lower.includes('chlorine') || lower.includes('pressure') || lower.includes('water') || lower.includes('comm')) {
        try {
          const valRes = await fetchWithRetry(`/streams/${a.WebId}/value`);
          const v = valRes?.data;
          console.log(`   ► ${a.Name} => Value: ${JSON.stringify(v?.Value)} | Units: ${v?.UnitsAbbreviation || ''} | Timestamp: ${v?.Timestamp}`);
        } catch (e: any) {
          console.log(`   ► ${a.Name} => Error: ${e.message}`);
        }
      }
    }
  }
}

testTargetedESR().catch(console.error);
