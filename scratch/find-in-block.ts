import axios from 'axios';
import https from 'https';

const piClient = axios.create({
  baseURL: 'https://192.168.1.6/piwebapi',
  auth: {
    username: '.\\piadmin',
    password: 'JJM@123'
  },
  httpsAgent: new https.Agent({  
    rejectUnauthorized: false 
  })
});

async function run() {
  const divisions = ['Division-Ahmednagar', 'Division-Ahmednagar ZP', 'Division-Ahmednagar MJP'];
  const regions = ['Region-Nashik', 'Region-Pune'];
  
  for (const reg of regions) {
    for (const div of divisions) {
       const blockPath = `\\\\DemoAF\\\\JJM\\\\JJM\\\\Maharashtra\\\\${reg}\\\\Circle-Ahmednagar\\\\${div}\\\\Sub Division-Newasa\\\\Block-Shevgaon`;
       try {
         const res = await piClient.get(`/elements?path=${encodeURIComponent(blockPath)}`);
         const childrenRes = await piClient.get(res.data.Links.Elements);
         
         console.log(`\nFound Block: ${blockPath}`);
         for (const child of childrenRes.data.Items) {
           console.log(" -", child.Name);
         }
       } catch (err) {}
    }
  }
}
run();
