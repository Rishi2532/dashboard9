import { getAttributeInterpolatedData } from '../server/services/pi-web-api-service';
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

async function main() {
  const schemePath = '\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-Amravati\\Circle-Akola\\Division-Akola\\Sub Division-Akola\\Block-Akola\\Scheme-20027951 - Khambora 60 VRRWSS Tq. & Dist. Akola';
  try {
    const res = await piClient.get('/elements?path=' + encodeURIComponent(schemePath));
    const elementsRes = await piClient.get(res.data.Links.Elements);
    console.log("VILLAGES:", elementsRes.data.Items.map((i: any) => i.Name));
  } catch(e) {
    console.error(e);
  }
}
main();
