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

async function test() {
  const webId = 'F1EmIeWj7r-h2Eis7H1W2aY3wAQH-x_VIf46hGl-tPZ0VlBQA11oT1-fCvkWMd3P2a78V6QRGVtb0FGXEpKTVxKSk1cTUFIQVJBU0hUUkFcUkVHSU9OLUFNUkFWQVRJXENJUkNMRS1BS09MQVxESVZJU0lPTi1BS09MQVxTVUIgRElWSVNJT04tQUtPTEFcQkxPQ0stQUtPTEFcU0NIRU1FLTIwMDI3OTUxIC0gS0hBTUJPUkEgNjAgVlJSV1NTIFRRLiAmIERJU1QuIEFLT0xBXEFLSEFUV0FEQQ';
  
  try {
    const attrRes = await piClient.get(`/elements/${webId}/attributes?nameFilter=Calc%20-%20Water%20Consumption%20per%20day`);
    const attrWebId = attrRes.data.Items[0].WebId;
    
    console.log("Fetching with summaries (t-7d to t) :");
    const res2 = await piClient.get(`/streams/${attrWebId}/summary?startTime=t-7d&endTime=t&summaryType=Maximum&summaryDuration=1d`);
    console.log(JSON.stringify(res2.data.Items.map(i => ({ timestamp: i.Value.Timestamp, value: i.Value.Value })), null, 2));

  } catch(e) {
    if (e.response && e.response.data) {
      console.error(JSON.stringify(e.response.data, null, 2));
    } else {
      console.error(e.message);
    }
  }
}

test();
