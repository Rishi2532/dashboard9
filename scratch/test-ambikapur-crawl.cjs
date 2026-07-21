const axios = require('axios');
const https = require('https');

async function run() {
  try {
    const piClient = axios.create({
      baseURL: 'https://192.168.1.6/piwebapi',
      auth: { username: '.\\piadmin', password: 'JJM@123' },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      timeout: 10000
    });
    
    // Find Akola Division
    const divisionPath = '\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Amravati\\Akola\\Akola';
    console.log('Querying Division:', divisionPath);
    const divRes = await piClient.get('/elements?path=' + encodeURIComponent(divisionPath));
    const divId = divRes.data.WebId;
    
    // List blocks/schemes
    const blocksRes = await piClient.get(`/elements/${divId}/elements`);
    const akolaBlock = blocksRes.data.Items.find(b => b.Name === 'Akola');
    
    if (akolaBlock) {
      const schemesRes = await piClient.get(`/elements/${akolaBlock.WebId}/elements`);
      const khambora = schemesRes.data.Items.find(s => s.Name.includes('20027951'));
      console.log('Found Scheme:', khambora?.Name);
      
      if (khambora) {
        const villagesRes = await piClient.get(`/elements/${khambora.WebId}/elements`);
        const ambikapur = villagesRes.data.Items.find(v => v.Name === 'Ambikapur');
        console.log('Found Village:', ambikapur?.Name);
        
        if (ambikapur) {
          const esrsRes = await piClient.get(`/elements/${ambikapur.WebId}/elements`);
          console.log('ESRs in Ambikapur:');
          esrsRes.data.Items.forEach(e => {
            console.log(`- ${e.Name} (Template: ${e.TemplateName})`);
          });
        }
      }
    }
    
  } catch (error) {
    console.error('Error fetching from PI:', error?.response?.data || error.message);
  }
  
  process.exit(0);
}
run();
