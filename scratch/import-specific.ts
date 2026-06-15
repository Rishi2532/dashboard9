import axios from 'axios';
import https from 'https';
import { runPiChlorineIngestion } from '../server/cron/pi-chlorine-ingestion';

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

async function findInPath(path: string, keyword: string): Promise<string[]> {
  try {
    const elRes = await piClient.get(`/elements?path=${encodeURIComponent(path)}`);
    const childrenRes = await piClient.get(elRes.data.Links.Elements);
    
    let foundPaths: string[] = [];
    for (const child of childrenRes.data.Items) {
      if (child.Name.toLowerCase().includes(keyword.toLowerCase())) {
        foundPaths.push(child.Path);
      } else {
        const sub = await findInPath(child.Path, keyword);
        foundPaths = foundPaths.concat(sub);
      }
    }
    return foundPaths;
  } catch (error) {
    return [];
  }
}

async function run() {
  const divisions = ['Division-Ahmednagar', 'Division-Ahmednagar ZP', 'Division-Ahmednagar MJP'];
  const regions = ['Region-Nashik', 'Region-Pune'];
  let found = null;
  for (const reg of regions) {
    for (const div of divisions) {
      const startPath = `\\\\DemoAF\\\\JJM\\\\JJM\\\\Maharashtra\\\\${reg}\\\\Circle-Ahmednagar\\\\${div}\\\\Sub Division-Newasa\\\\Block-Shevgaon`;
      console.log("Searching in", startPath);
      try {
          const results = await findInPath(startPath, '20029079');
          if (results.length > 0) {
            found = results[0];
            break;
          }
      } catch (err) {}
    }
    if (found) break;
  }
  
  if (found) {
     console.log("Found scheme path:", found);
     const esrs = await findInPath(found, 'Chapadgaon');
     if (esrs.length > 0) {
        console.log("Found ESR path:", esrs[0]);
        await runPiChlorineIngestion(found);
     } else {
        console.log("Could not find Chapadgaon explicit folder, trying full scheme ingestion");
        await runPiChlorineIngestion(found);
     }
  } else {
     console.log("Scheme not found in any of those paths.");
  }
}
run();
