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

async function checkPath(path: string) {
  try {
    const res = await piClient.get(`/elements?path=${encodeURIComponent(path)}`);
    console.log(`✅ FOUND: ${path}`);
    return true;
  } catch (err: any) {
    return false;
  }
}

async function run() {
  const regions = ['Region-Nashik', 'Region-Pune'];
  const divisions = ['Division-Ahmednagar', 'Division-Ahmednagar ZP', 'Division-Ahmednagar MJP'];
  const prefixes = ['Scheme-20029079 - ', 'Scheme-', ''];
  const names = ['Retro.Bodhegaon and 7 villages RRWSS. Ta. Shevgaon', 'Retro. Bodhegaon and 7 villages RRWSS. Ta. Shevgaon', 'Bodhegaon and 7 villages RRWSS. Ta. Shevgaon'];
  
  for (const reg of regions) {
    for (const div of divisions) {
       for (const pre of prefixes) {
          for (const name of names) {
            const p = `\\\\DemoAF\\\\JJM\\\\JJM\\\\Maharashtra\\\\${reg}\\\\Circle-Ahmednagar\\\\${div}\\\\Sub Division-Newasa\\\\Block-Shevgaon\\\\${pre}${name}`;
            const found = await checkPath(p);
            if (found) {
              console.log("SUCCESS:", p);
              process.exit(0);
            }
          }
       }
    }
  }
  console.log("Not found any combination.");
}
run();
