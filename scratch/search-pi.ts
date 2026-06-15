import { getDB } from '../server/db';
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

async function findInPath(path: string, keyword: string): Promise<string[]> {
  try {
    const elRes = await piClient.get(`/elements?path=${encodeURIComponent(path)}`);
    const childrenRes = await piClient.get(elRes.data.Links.Elements);
    
    let foundPaths: string[] = [];
    for (const child of childrenRes.data.Items) {
      if (child.Name.toLowerCase().includes(keyword.toLowerCase())) {
        foundPaths.push(child.Path);
      } else {
        // Only go down if it's a structural folder to avoid infinite loop
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
  const regions = [
    '\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-Nashik\\Circle-Ahmednagar',
    '\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-Pune\\Circle-Ahmednagar'
  ];
  for (const region of regions) {
    console.log("Searching in", region);
    const results = await findInPath(region, '20029079');
    if (results.length > 0) {
      console.log("Found:", results);
      process.exit(0);
    }
  }
}
run();
