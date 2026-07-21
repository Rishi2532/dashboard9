const { Client } = require('pg');
const axios = require('axios');
const https = require('https');

async function run() {
  const client = new Client({ connectionString: 'postgresql://postgres:Ceinsys%402025@localhost:5432/water_scheme_dashboard' });
  await client.connect();
  const row = (await client.query("SELECT * FROM water_consumption WHERE scheme_id = '20027951' AND village_name = 'Ambikapur'")).rows;
  console.log('Row found in DB for Ambikapur Water:', row);
  
  try {
    const targetPath = '\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Amravati\\Akola\\Akola\\Akola\\Ambikapur\\Proposed 1.00 LL MBR-Outlet-1';
    console.log('Querying path in PI Web API for TemplateName:', targetPath);
    
    const piClient = axios.create({
      baseURL: 'https://192.168.1.6/piwebapi',
      auth: { username: '.\\piadmin', password: 'JJM@123' },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      timeout: 10000
    });
    
    const res = await piClient.get('/elements?path=' + encodeURIComponent(targetPath));
    console.log('Element found:', res.data.Name);
    console.log('TemplateName:', res.data.TemplateName);
    
    // Get its attributes
    const attrRes = await piClient.get('/elements/' + res.data.WebId + '/attributes');
    const waterAttr = attrRes.data.Items.find(a => a.Name === 'CALC - WATER CONSUMPTION PER DAY');
    console.log('Water Attribute found:', !!waterAttr);
    
    if (waterAttr) {
      const valRes = await piClient.get('/streams/' + waterAttr.WebId + '/summary?startTime=*-7d&endTime=*&summaryType=Total&summaryDuration=1d');
      console.log('Water Consumption 7d values:', JSON.stringify(valRes.data.Items, null, 2));
    }
  } catch (error) {
    console.error('Error fetching from PI:', error?.response?.data || error.message);
  }
  
  process.exit(0);
}
run();
