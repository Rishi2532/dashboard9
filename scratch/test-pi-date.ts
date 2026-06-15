import { getAttributeSummaryData } from '../server/services/pi-web-api-service.js';
async function run() {
  const points = await getAttributeSummaryData('F1EmxhLDZFZ34kmH6xG5VCcEpgyHezslug8BGiXABQVgEkSAREVNT0FGXEpKTVxKSk1cTUFIQVJBU0hUUkFcUkVHSU9OLUFNUkFWQVRJXENJUkNMRS1BS09MQVxESVZJU0lPTi1BS09MQVxTVUIgRElWSVNJT04tQUtPTEFcQkxPQ0stQUtPTEFcU0NIRU1FLTIwMDI3OTUxIC0gS0hBTUJPUkEgNjAgVlJSV1NTIFRRLiAmIERJU1QuIEFLT0xBXEpBTEFCQURcRVhJU1RJTkcgMC40MCBMTCBFU1I', 'Flow Rate', 7, 'Maximum');
  console.log(JSON.stringify(points, null, 2));
  process.exit(0);
}
run();
