import { fetchWithRetry } from '../server/services/pi-web-api-service.ts';

async function testSingleCall() {
  const assetPath = '\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-Amravati\\Circle-Akola\\Division-Akola\\Sub Division-Akola\\Block-Telhara_Akola\\Scheme-20028565 - Akot 84 VRRWSS Tq. Akola, Akot & Telhara Dist. Akola\\Keliweli (Old)\\Existing 1.5 LL ESR';
  const attrPath = `${assetPath}|CALC - WATER CONSUMPTION PER DAY`;

  console.log('Testing single summary call by path...');
  const t0 = Date.now();
  const res = await fetchWithRetry(`/streams/summary?path=${encodeURIComponent(attrPath)}&startTime=2024-01-01&endTime=*&summaryType=Maximum&summaryDuration=1d`);
  const t1 = Date.now();
  console.log(`Single call succeeded in ${t1 - t0}ms! Items count: ${res.data.Items ? res.data.Items.length : 0}`);

  const nonZero = res.data.Items?.filter((it: any) => it.Value && typeof it.Value.Value === 'number' && it.Value.Value > 0) || [];
  console.log(`Non-zero valid items: ${nonZero.length}`);
  if (nonZero.length > 0) {
    console.log('First non-zero item:', nonZero[0]);
    console.log('Last non-zero item:', nonZero[nonZero.length - 1]);
  }
  process.exit(0);
}

testSingleCall().catch(err => {
  console.error(err);
  process.exit(1);
});
