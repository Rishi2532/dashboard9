import { fetchWithRetry } from '../server/services/pi-web-api-service.ts';

async function testVillageStart() {
  const assetPath = '\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-Amravati\\Circle-Akola\\Division-Akola\\Sub Division-Akola\\Block-Akola\\Scheme-20027951 - Khambora 60 VRRWSS Tq. & Dist. Akola\\Mathodi';
  const elemRes = await fetchWithRetry(`/elements?path=${encodeURIComponent(assetPath)}`);
  const elemWebId = elemRes?.data?.WebId;
  console.log('Mathodi Element WebId:', elemWebId);

  const attrsRes = await fetchWithRetry(`/elements/${elemWebId}/attributes?nameFilter=*Water Consumption*`);
  const items = attrsRes?.data?.Items || [];
  const waterAttr = items.find((i: any) => i.Name.toLowerCase() === 'calc - water consumption per day') || items[0];
  console.log('Water Attr:', waterAttr.Name, waterAttr.WebId);

  // Check summary
  const sumRes = await fetchWithRetry(`/streams/${waterAttr.WebId}/summary?startTime=2024-01-01&endTime=*&summaryType=Maximum&summaryDuration=1d`);
  const sumItems = sumRes?.data?.Items || [];
  console.log(`Total summary items returned: ${sumItems.length}`);

  // Find the first good / non-system valid value
  const validItems = sumItems.filter((it: any) => {
    const pt = it?.Value;
    if (!pt || pt.Good === false) return false;
    if (typeof pt.Value === 'object' && (pt.Value.IsSystem || pt.Value.Name === 'Pt Created' || pt.Value.Name === 'Calc Failed' || pt.Value.Value === 'No Data')) {
      return false;
    }
    const num = typeof pt.Value === 'number' ? pt.Value : typeof pt === 'number' ? pt : null;
    return num !== null && !isNaN(num);
  });

  console.log(`Total valid items: ${validItems.length}`);
  if (validItems.length > 0) {
    console.log('First 5 valid items:', validItems.slice(0, 5));
    console.log('Last 5 valid items:', validItems.slice(-5));
  }

  // Also check if there are other attributes on the element like "Commissioning Date", "Installation Date", "Integration Date", "Status", etc.
  const allAttrsRes = await fetchWithRetry(`/elements/${elemWebId}/attributes`);
  const allAttrs = allAttrsRes?.data?.Items || [];
  console.log('\nAll attributes on Mathodi Village:');
  for (const a of allAttrs) {
    console.log(` - ${a.Name} (Type: ${a.Type})`);
  }
}

testVillageStart().catch(console.error);
