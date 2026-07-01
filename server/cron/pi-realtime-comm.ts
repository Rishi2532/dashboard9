import cron from "node-cron";
import { getDB } from "../db";
import { realtimeSensorData } from "@shared/schema";
import {
  getAllESRs,
  getAttributeValue,
  extractHierarchyFromPath,
  PIElement
} from "../services/pi-web-api-service";

function mapRealtimeStatus(pt: any): string | null {
  if (pt === undefined || pt === null) return null;
  const val = typeof pt === 'object' ? pt.Value : pt;
  if (val === 2 || String(val) === '2') return 'Online';
  if (val === 0 || String(val) === '0') return 'Offline';
  return null;
}

let isIngesting = false;

export async function runPiRealtimeCommIngestion(rootPath?: string) {
  if (isIngesting) {
    console.log("PI Web API Realtime Comm Ingestion is already running. Skipping this cycle.");
    return;
  }
  isIngesting = true;
  console.log("Starting PI Web API Realtime Communication Ingestion...");

  try {
    const db = await getDB();
    const esrs: PIElement[] = await getAllESRs(rootPath);
    console.log(`Found ${esrs.length} ESRs in PI AF for Realtime Comm.`);

    const BATCH_SIZE = 100;

    for (let i = 0; i < esrs.length; i += BATCH_SIZE) {
      const batch = esrs.slice(i, i + BATCH_SIZE);

      await Promise.all(batch.map(async (esr) => {
        try {
          const hierarchy = extractHierarchyFromPath(esr.Path);

          if (!hierarchy.scheme_id || !hierarchy.esr_name) {
            return;
          }

          const [chlorineComm, pressureComm, flowRateComm] = await Promise.all([
            getAttributeValue(esr.WebId, 'Communication Status - Chlorine - Realtime'),
            getAttributeValue(esr.WebId, 'Communication Status - Pressure - Realtime'),
            getAttributeValue(esr.WebId, 'Communication Status - Flow Rate - Realtime')
          ]);

          const clStatus = mapRealtimeStatus(chlorineComm);
          const prStatus = mapRealtimeStatus(pressureComm);
          const flStatus = mapRealtimeStatus(flowRateComm);

          if (clStatus !== null || prStatus !== null || flStatus !== null) {
            const record = {
              scheme_id: hierarchy.scheme_id,
              village_name: hierarchy.village_name || "",
              esr_name: hierarchy.esr_name,
              chlorine_comm_status: clStatus,
              pressure_comm_status: prStatus,
              flow_rate_comm_status: flStatus,
              last_updated_comm: new Date()
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
                  chlorine_comm_status: record.chlorine_comm_status,
                  pressure_comm_status: record.pressure_comm_status,
                  flow_rate_comm_status: record.flow_rate_comm_status,
                  last_updated_comm: record.last_updated_comm
                }
              });
          }
        } catch (esrError) {
          console.error(`Error processing ESR for Realtime Comm: ${esr.Path}`, esrError);
        }
      }));
    }

    console.log("Completed PI Web API Realtime Communication Ingestion.");
  } catch (error) {
    console.error("Critical error in Realtime Comm Ingestion:", error);
  } finally {
    isIngesting = false;
  }
}

export function initPiRealtimeCommCron() {
  cron.schedule('* * * * *', async () => {
    await runPiRealtimeCommIngestion();
  });
  console.log('PI Realtime Comm Cron initialized (runs every 1 minute)');
}
