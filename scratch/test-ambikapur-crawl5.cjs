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
    
    const amravati = childrenRes.data.Items.find(i => i.Name.includes('Amravati'));
    const amrChildren = await piClient.get(`/elements/${amravati.WebId}/elements`);
    
    const akola = amrChildren.data.Items.find(i => i.Name.includes('Akola'));
    const akolaChildren = await piClient.get(`/elements/${akola.WebId}/elements`);
    
    const akolaDiv = akolaChildren.data.Items.find(i => i.Name.includes('Akola'));
    const divChildren = await piClient.get(`/elements/${akolaDiv.WebId}/elements`);
    
    console.log('Children of Division-Akola:', divChildren.data.Items.map(i => i.Name));
    
    // Check both Sub Division-Akola and maybe Block-Akola
    for (const child of divChildren.data.Items) {
      if (child.Name.includes('Akola')) {
        const subChildren = await piClient.get(`/elements/${child.WebId}/elements`);
        console.log(`Children of ${child.Name}:`, subChildren.data.Items.map(i => i.Name).slice(0, 10), '...');
        
        for (const block of subChildren.data.Items) {
           if (block.Name.includes('Akola')) {
              const bChildren = await piClient.get(`/elements/${block.WebId}/elements`);
              const kham = bChildren.data.Items.find(i => i.Name.includes('20027951'));
              if (kham) {
                 console.log('Found Scheme under', block.Name, '->', kham.Name);
                 const vill = await piClient.get(`/elements/${kham.WebId}/elements`);
                 const ambi = vill.data.Items.find(i => i.Name.includes('Ambikapur'));
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
