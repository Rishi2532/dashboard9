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
    
    const path = '\\\\DemoAF\\JJM\\JJM\\Maharashtra';
    const res = await piClient.get('/elements?path=' + encodeURIComponent(path));
    const childrenRes = await piClient.get(`/elements/${res.data.WebId}/elements`);
    const amravati = childrenRes.data.Items.find(i => i.Name === 'Region-Amravati');
    if (amravati) {
      const amrChildren = await piClient.get(`/elements/${amravati.WebId}/elements`);
      const akola = amrChildren.data.Items.find(i => i.Name === 'Circle-Akola');
      if (akola) {
        const akolaChildren = await piClient.get(`/elements/${akola.WebId}/elements`);
        const akolaDiv = akolaChildren.data.Items.find(i => i.Name === 'Division-Akola');
        if (akolaDiv) {
          const divChildren = await piClient.get(`/elements/${akolaDiv.WebId}/elements`);
          const akolaBlock = divChildren.data.Items.find(i => i.Name === 'Block-Akola');
          if (akolaBlock) {
             const blockChildren = await piClient.get(`/elements/${akolaBlock.WebId}/elements?maxCount=100000`);
             const kham = blockChildren.data.Items.find(i => i.Name.includes('20027951'));
             console.log('Found Scheme:', kham?.Name);
             
             if (kham) {
               const vill = await piClient.get(`/elements/${kham.WebId}/elements`);
               const ambi = vill.data.Items.find(i => i.Name === 'Village-Ambikapur');
               if (ambi) {
                  const esrs = await piClient.get(`/elements/${ambi.WebId}/elements`);
                  console.log('ESRs in Ambikapur:');
                  esrs.data.Items.forEach(e => console.log(e.Name, '-> Template:', e.TemplateName));
               }
             }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error fetching from PI:', error?.response?.data || error.message);
  }
  
  process.exit(0);
}
run();
