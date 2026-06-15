import { getAttributeSummaryData } from '../server/services/pi-web-api-service';

async function test() {
  const webId = 'F1EmIeWj7r-h2Eis7H1W2aY3wAQH-x_VIf46hGl-tPZ0VlBQA11oT1-fCvkWMd3P2a78V6QRGVtb0FGXEpKTVxKSk1cTUFIQVJBU0hUUkFcUkVHSU9OLUFNUkFWQVRJXENJUkNMRS1BS09MQVxESVZJU0lPTi1BS09MQVxTVUIgRElWSVNJT04tQUtPTEFcQkxPQ0stQUtPTEFcU0NIRU1FLTIwMDI3OTUxIC0gS0hBTUJPUkEgNjAgVlJSV1NTIFRRLiAmIERJU1QuIEFLT0xBXEFLSEFUV0FEQQ';
  
  const waterPoints = await getAttributeSummaryData(webId, 'Calc - Water Consumption per day', 7, 'Maximum');
  console.log("Water Points:", JSON.stringify(waterPoints, null, 2));
}

test().catch(console.error);
