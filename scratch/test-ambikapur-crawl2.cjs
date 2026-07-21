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
    
    // Find Maharashtra elements
    const path = '\\\\DemoAF\\JJM\\JJM\\Maharashtra';
    const res = await piClient.get('/elements?path=' + encodeURIComponent(path));
    const childrenRes = await piClient.get(`/elements/${res.data.WebId}/elements`);
    console.log('Children of Maharashtra:', childrenRes.data.Items.map(i => i.Name));
    
    const amravati = childrenRes.data.Items.find(i => i.Name === 'Amravati');
    if (amravati) {
      const amrChildren = await piClient.get(`/elements/${amravati.WebId}/elements`);
      console.log('Children of Amravati:', amrChildren.data.Items.map(i => i.Name));
      
      const akola = amrChildren.data.Items.find(i => i.Name === 'Akola');
      if (akola) {
        const akolaChildren = await piClient.get(`/elements/${akola.WebId}/elements`);
        console.log('Children of Akola (Circle):', akolaChildren.data.Items.map(i => i.Name));
        
        const akolaDiv = akolaChildren.data.Items.find(i => i.Name === 'Akola');
        if (akolaDiv) {
          const divChildren = await piClient.get(`/elements/${akolaDiv.WebId}/elements`);
          console.log('Children of Akola (Division):', divChildren.data.Items.map(i => i.Name));
          
          const akolaBlock = divChildren.data.Items.find(i => i.Name === 'Akola');
          if (akolaBlock) {
             const blockChildren = await piClient.get(`/elements/${akolaBlock.WebId}/elements`);
             const kham = blockChildren.data.Items.find(i => i.Name.includes('20027951'));
             console.log('Found Scheme:', kham?.Name);
             
             if (kham) {
               const vill = await piClient.get(`/elements/${kham.WebId}/elements`);
               console.log('Villages:', vill.data.Items.map(i => i.Name));
               
               const ambi = vill.data.Items.find(i => i.Name === 'Ambikapur');
               if (ambi) {
                  const esrs = await piClient.get(`/elements/${ambi.WebId}/elements`);
                  console.log('ESRs in Ambikapur:');
                  esrs.data.Items.forEach(e => console.log(e.Name, '->', e.TemplateName));
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
