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
  const schemePath = '\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-Amravati\\Circle-Akola\\Division-Akola\\Sub Division-Akola\\Block-Akola\\Scheme-20027951 - Khambora 60 VRRWSS Tq. & Dist. Akola\\Dhamna';
  try {
    const res = await piClient.get('/elements?path=' + encodeURIComponent(schemePath));
    const elementsRes = await piClient.get(res.data.Links.Elements);
    const esr = elementsRes.data.Items[0];
    
    console.log("Found ESR:", esr.Name);
    
    const attrsRes = await piClient.get(esr.Links.Attributes + '?nameFilter=Chlorine');
    if (attrsRes.data.Items.length > 0) {
      const chlorineAttr = attrsRes.data.Items[0];
      const webId = chlorineAttr.WebId;
      
      console.log("Testing summary endpoint for Maximum...");
      // Try getting daily maximums
      const summaryRes = await piClient.get(`/streams/${webId}/summary?summaryType=Maximum&startTime=*-7d&endTime=*&summaryDuration=1d`);
      console.log(JSON.stringify(summaryRes.data, null, 2));
    }
  } catch(e: any) {
    console.error(e.response?.data || e.message);
  }
}
main();
