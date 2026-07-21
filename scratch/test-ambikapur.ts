import { getDB } from './server/db.ts';
import { waterConsumption } from './shared/schema.ts';
import { and, eq } from 'drizzle-orm';
import { findElementsByTemplate } from './server/services/pi-web-api-service.ts';

async function run() {
  const db = await getDB();
  const row = await db.select().from(waterConsumption).where(
    and(
      eq(waterConsumption.scheme_id, '20027951'),
      eq(waterConsumption.village_name, 'Ambikapur')
    )
  );
  console.log('Row found in DB:', row);
  
  try {
    const targetPath = '\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Amravati\\Akola\\Akola\\Akola\\Ambikapur\\Proposed 1.00 LL MBR-Outlet-1';
    console.log('Querying path in PI Web API for TemplateName...');
    
    // We don't have a direct "getElementByPath" in pi-web-api-service exported, but we can do a fetch
    const { default: axios } = await import('axios');
    const https = await import('https');
    
    const client = axios.create({
      baseURL: 'https://192.168.1.6/piwebapi',
      auth: { username: 'WebAppUser', password: 'WebAppUser@123' },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      timeout: 10000
    });
    
    const res = await client.get(`/elements?path=${encodeURIComponent(targetPath)}`);
    console.log('Element found:', res.data.Name);
    console.log('TemplateName:', res.data.TemplateName);
    
    // Get its attributes
    const attrRes = await client.get(`/elements/${res.data.WebId}/attributes`);
    const waterAttr = attrRes.data.Items.find((a: any) => a.Name === 'CALC - WATER CONSUMPTION PER DAY');
    console.log('Water Attribute found:', !!waterAttr);
    
    if (waterAttr) {
      const valRes = await client.get(`/streams/${waterAttr.WebId}/summary?startTime=*-7d&endTime=*&summaryType=Total&summaryDuration=1d`);
      console.log('Water Consumption 7d values:', JSON.stringify(valRes.data.Items, null, 2));
    }
  } catch (error: any) {
    console.error('Error fetching from PI:', error?.response?.data || error.message);
  }
  
  process.exit(0);
}
run();
