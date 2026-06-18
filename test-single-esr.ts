import { fetchWithRetry, getAttributeData } from './server/services/pi-web-api-service.ts';
async function run() {
  const searchRes = await fetchWithRetry('/elements?path=\\\\%5CDemoAF%5CJJM%5CJJM%5CMaharashtra%5CRegion-Pune%5CCircle-Pune%5CDivision-Pune%5CSub%20Division-Khed%5CBlock-Khed%5CScheme-20030588%20-%20NIMGAON%20SINGLE%20VILLAGE%20WATER%20SUPPLY%20SCHEME%5CNimgaon%5CExisting%200.22%20LL%20ESR');
  const w = searchRes.data.WebId;
  const attrs = await fetchWithRetry('/elements/' + w + '/attributes');
  const names = attrs.data.Items.map((i: any) => i.Name);
  console.log("Attributes:", names);
  const data = await getAttributeData(w, 'Chlorine');
  console.log("Chlorine Data:", JSON.stringify(data, null, 2));
}
run();
