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
   const mhPath = '\\\\DemoAF\\\\JJM\\\\JJM\\\\Maharashtra';
   try {
     const res = await piClient.get(`/elements?path=${encodeURIComponent(mhPath)}`);
     const childrenRes = await piClient.get(res.data.Links.Elements);
     
     console.log("Regions:");
     for (const child of childrenRes.data.Items) {
       console.log(child.Name);
       if (child.Name.includes('Nashik') || child.Name.includes('Pune')) {
           const circRes = await piClient.get(child.Links.Elements);
           for (const circ of circRes.data.Items) {
               console.log("  -", circ.Name);
               if (circ.Name.includes('Ahmednagar')) {
                   const divRes = await piClient.get(circ.Links.Elements);
                   for (const div of divRes.data.Items) {
                       console.log("    -", div.Name);
                       const subRes = await piClient.get(div.Links.Elements);
                       for (const sub of subRes.data.Items) {
                           console.log("      -", sub.Name);
                       }
                   }
               }
           }
       }
     }
   } catch (err) {
       console.error(err);
   }
}
run();
