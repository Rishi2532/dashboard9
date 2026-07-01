import { fetchWithRetry } from '../server/services/pi-web-api-service.ts';

async function run() {
  console.log("Searching for 20077229 MBR-1.00 LL...");
  try {
      const searchRes = await fetchWithRetry('/elements?nameFilter=' + encodeURIComponent('MBR-1.00 LL') + '&searchFullHierarchy=true');
      const elem = searchRes.data.Items.find((i: any) => i.Path.includes('20077229'));
      if (elem) {
         console.log('Found element:', elem.Path);
         const attrs = await fetchWithRetry('/elements/' + elem.WebId + '/attributes?nameFilter=Chlorine');
         if (attrs.data.Items && attrs.data.Items.length > 0) {
             const attrWebId = attrs.data.Items[0].WebId;
             console.log('Has Chlorine attribute. Fetching summary...');
             const summaryRes = await fetchWithRetry('/streams/' + attrWebId + '/summary?startTime=*-7d&endTime=*&summaryType=Maximum&summaryDuration=1d');
             console.log(JSON.stringify(summaryRes.data.Items, null, 2));
         } else {
             console.log('NO Chlorine attribute found on this ESR!');
         }
      } else {
         console.log('Element not found in PI Web API');
      }
  } catch (e) {
      console.error(e);
  }
}

run();
