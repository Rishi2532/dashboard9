import { getAttributeSummaryData } from '../server/services/pi-web-api-service';
async function test() {
  const data = await getAttributeSummaryData('F1AbExhLDZFZ34kmH6xG5VCcEpgec7kHwQ56BGB9ABQVgEkTASdaPrPbANVAGXjD85UkppQREVNT0FGXEpKTVxKSk1cTUFIQVJBU0hUUkFcUkVHSU9OLUFNUkFWQVRJXENJUkNMRS1BS09MQVxESVZJU0lPTi1BS09MQVxTVUIgRElWSVNJT04tQUtPTEEgSUlcQkxPQ0stQkFSU0hJVEFLTElcU0NIRU1FLTIwMDE4NTk1IC0gS0FLS0FEREFUSTBWSUxMQUdFU1JSUFdTXFRPS0kgVEFOREFcRVhJU1RJTkcgMC43MCBMTCBFU1J8Q0hMT1JJTkU', 'Chlorine', 7, 'Maximum');
  console.log(JSON.stringify(data, null, 2));
}
test();
