import { getAttributeData } from './server/services/pi-web-api-service.ts';
import { getDB } from './server/db.ts';
import { realtimeSensorData } from './shared/schema.ts';

async function run() {
  const BATCH_SIZE = 1;
  // Dahigaon ESR WebId from previous run:
  const w = 'F1EmxP1E3tIfxUyE4gI80HtlWwz-lCmr1o7BGAXgAQMIFgOQREVNT0FGXEpKTVxKSk1cTUhBUkFTSFRSQVxSRUdJT04tTkFTSElLXENJUkNMRS1BSE1FRE5BR0FSXERJVklTSU9OLUFITUJETkFHQVIgWlBcU1VCIERJVklTSU9OLU5FV0FTQVxCTE9DSy1TSEVWR0FPTlxTQ0hFTUUtMjAwMjc5NTEgLSBSRVRSTy5CT0RIRUdBT04gQU5EIDcgVklMTEFHRVMgUlJXU1MuIFRBLiBTSEVWR0FPTlxEQUhJR0FPTlxQUk9QT1NFRCAxLjcgTEwgRVNSLSBPVVRMRVQtMQ';

  const data = await getAttributeData(w, 'Chlorine');
  console.log("Chlorine data:", data);

  let chlorineValue: number | null = null;
  let chlorineTimestamp: Date | null = null;
  
  if (data && data.Value !== undefined) {
    chlorineValue = typeof data.Value === 'number' ? data.Value : null;
    if (typeof data.Value === 'object' && data.Value !== null && 'Value' in data.Value) {
       chlorineValue = data.Value.Value;
    }
    if (data.Timestamp) {
      chlorineTimestamp = new Date(data.Timestamp);
    }
  }

  console.log("Parsed Value:", chlorineValue);
  console.log("Parsed Timestamp:", chlorineTimestamp);
  
  if (chlorineTimestamp) {
     const db = await getDB();
     await db.insert(realtimeSensorData)
       .values({
          scheme_id: 'TEST1234',
          village_name: 'TEST_VILLAGE',
          esr_name: 'TEST_ESR',
          chlorine_value: chlorineValue !== null ? chlorineValue.toString() : null,
          chlorine_timestamp: chlorineTimestamp,
          last_updated_values: new Date()
       });
     console.log("Inserted test row into DB");
  }
}

run();
