import cron from "node-cron";
import { getDB } from "../db";
import { realtimeSensorData } from "@shared/schema";
import {
  getAllESRs,
  getAttributeData,
  extractHierarchyFromPath,
  PIElement
} from "../services/pi-web-api-service";

export async function runPiRealtimeValuesIngestion(rootPath?: string) {
  console.log("Starting PI Web API Realtime Values Ingestion...");

  try {
    const db = await getDB();
    const esrs: PIElement[] = await getAllESRs(rootPath);
    console.log(`Found ${esrs.length} ESRs in PI AF for Realtime Values.`);

    const BATCH_SIZE = 10;

    for (let i = 0; i < esrs.length; i += BATCH_SIZE) {
      const batch = esrs.slice(i, i + BATCH_SIZE);

      await Promise.all(batch.map(async (esr) => {
        try {
          const hierarchy = extractHierarchyFromPath(esr.Path);

          if (!hierarchy.scheme_id || !hierarchy.esr_name) {
            return;
          }

          // Fetch only the latest Chlorine and Pressure values and timestamps
          const [chlorineAttr, pressureAttr] = await Promise.all([
            getAttributeData(esr.WebId, 'Chlorine'),
            getAttributeData(esr.WebId, 'Pressure')
          ]);

          let chlorineValue: number | null = null;
          let chlorineTimestamp: Date | null = null;
          if (chlorineAttr && chlorineAttr.Value !== undefined) {
            chlorineValue = typeof chlorineAttr.Value === 'number' ? chlorineAttr.Value : null;
            if (typeof chlorineAttr.Value === 'object' && chlorineAttr.Value !== null && 'Value' in chlorineAttr.Value) {
               // Support digital states like {"Name": "Pt Created", "Value": 253}
               if (chlorineAttr.Value.IsSystem) {
                 chlorineValue = null;
               } else {
                 chlorineValue = chlorineAttr.Value.Value;
               }
            }
            // Only set timestamp if we have a valid non-system value
            if (chlorineValue !== null && chlorineAttr.Timestamp) {
              chlorineTimestamp = new Date(chlorineAttr.Timestamp);
            }
          }

          let pressureValue: number | null = null;
          let pressureTimestamp: Date | null = null;
          if (pressureAttr && pressureAttr.Value !== undefined) {
            pressureValue = typeof pressureAttr.Value === 'number' ? pressureAttr.Value : null;
            if (typeof pressureAttr.Value === 'object' && pressureAttr.Value !== null && 'Value' in pressureAttr.Value) {
               if (pressureAttr.Value.IsSystem) {
                 pressureValue = null;
               } else {
                 pressureValue = pressureAttr.Value.Value;
               }
            }
            // Only set timestamp if we have a valid non-system value
            if (pressureValue !== null && pressureAttr.Timestamp) {
              pressureTimestamp = new Date(pressureAttr.Timestamp);
            }
          }

          // Update DB if either value is valid (non-system)
          // If both are system states (null), we still might want to update the row to clear the values
          // so the UI knows they are currently offline/invalid.
          if (chlorineValue !== null || pressureValue !== null || true) {
            // Because we don't have an exact upsert helper imported here easily without adding conflict resolution
            // Let's use INSERT ... ON CONFLICT DO UPDATE
            const record = {
              scheme_id: hierarchy.scheme_id,
              village_name: hierarchy.village_name || "",
              esr_name: hierarchy.esr_name,
              chlorine_value: chlorineValue !== null ? chlorineValue.toString() : null,
              chlorine_timestamp: chlorineTimestamp,
              pressure_value: pressureValue !== null ? pressureValue.toString() : null,
              pressure_timestamp: pressureTimestamp,
              last_updated_values: new Date()
            };

            await db.insert(realtimeSensorData)
              .values(record)
              .onConflictDoUpdate({
                target: [
                  realtimeSensorData.scheme_id,
                  realtimeSensorData.village_name,
                  realtimeSensorData.esr_name
                ],
                set: {
                  chlorine_value: record.chlorine_value,
                  chlorine_timestamp: record.chlorine_timestamp,
                  pressure_value: record.pressure_value,
                  pressure_timestamp: record.pressure_timestamp,
                  last_updated_values: record.last_updated_values
                }
              });
          }
        } catch (esrError) {
          console.error(`Error processing ESR for Realtime Values: ${esr.Path}`, esrError);
        }
      }));
    }

    console.log("Completed PI Web API Realtime Values Ingestion.");
  } catch (error) {
    console.error("Critical error in Realtime Values Ingestion:", error);
  }
}

export function initPiRealtimeValuesCron() {
  cron.schedule('* * * * *', async () => {
    await runPiRealtimeValuesIngestion();
  });
  console.log('PI Realtime Values Cron initialized (runs every 1 minute)');
}
