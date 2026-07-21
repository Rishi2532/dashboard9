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
    
    // Search for the element
    console.log('Searching for Ambikapur...');
    const searchRes = await piClient.get('/search/query?q=name:Ambikapur');
    console.log('Search results:', JSON.stringify(searchRes.data.Items.map(i => i.Path), null, 2));
    
    console.log('Searching for MBR...');
    const searchRes2 = await piClient.get('/search/query?q=name:"Proposed 1.00 LL MBR-Outlet-1"');
    console.log('Search results:', JSON.stringify(searchRes2.data.Items.map(i => ({ Name: i.Name, Path: i.Path })), null, 2));
    
  } catch (error) {
    console.error('Error fetching from PI:', error?.response?.data || error.message);
  }
  
  process.exit(0);
}
run();
