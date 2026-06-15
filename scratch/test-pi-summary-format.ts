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
  try {
    const path = '\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-Amravati\\Circle-Akola\\Division-Buldhana\\Sub Division-Buldhana\\Block-Buldhana\\Scheme-20021406 - Padali & 5 Villages RRWSS\\Palaskhed Naik';
    const attrRes = await piClient.get(`/attributes?path=${encodeURIComponent(path + '|Calc - Water Consumption per day')}`);
    const webId = attrRes.data.WebId;

    const summary1 = await piClient.get(`/streams/${webId}/summary?summaryType=Maximum&startTime=t-7d&endTime=t&summaryDuration=1d`);
    console.log(JSON.stringify(summary1.data.Items, null, 2));

  } catch(e:any) {
    console.error(e.response?.status || e.message);
  }
}

test();
