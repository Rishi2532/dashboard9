import { getDB } from "../db";
import { communicationStatus } from "@shared/schema";
import {
  getAllESRs,
  getAttributeValue,
  extractHierarchyFromPath,
  PIElement
} from "../services/pi-web-api-service";

function checkConnected(pt: any): string | null {
  if (pt === undefined || pt === null) return null;

  if (typeof pt === 'object' && pt !== null && 'Value' in pt) {
    if (pt.IsSystem) {
      return 'Not Connected';
    } else {
      return 'Connected';
    }
  }

  if (typeof pt === 'number' || (typeof pt === 'string' && !isNaN(Number(pt)))) {
    return 'Connected';
  }

  return 'Not Connected';
}

function mapStatus24h(pt: any): string | null {
  if (pt === undefined || pt === null) return null;
  const val = typeof pt === 'object' ? pt.Value : pt;
  if (val === 1 || String(val) === '1' || val === 2 || String(val) === '2') return 'Online';
  if (val === 0 || String(val) === '0') return 'Offline';
  return null;
}

function mapStatus72h(pt: any): string | null {
  if (pt === undefined || pt === null) return null;
  const val = typeof pt === 'object' ? pt.Value : pt;
  if (val === 1 || String(val) === '1') return '1';
  if (val === 0 || String(val) === '0') return '0';
  return null;
}

export async function runPiCommunicationStatusIngestion(rootPath?: string) {
  console.log("Starting PI Web API Communication Status Ingestion...");

  try {
    const db = await getDB();
    const esrs: PIElement[] = await getAllESRs(rootPath);
    console.log(`Found ${esrs.length} ESRs in PI AF.`);

    let successCount = 0;
    let errorCount = 0;

    const BATCH_SIZE = 4;

    for (let i = 0; i < esrs.length; i += BATCH_SIZE) {
      const batch = esrs.slice(i, i + BATCH_SIZE);

      await Promise.all(batch.map(async (esr) => {
        try {
          const hierarchy = extractHierarchyFromPath(esr.Path);

          if (!hierarchy.scheme_id || !hierarchy.esr_name) {
            return;
          }

          const [
            chlorineVal,
            pressureVal,
            flowRateVal,
            chlorine24h,
            pressure24h,
            flowRate24h,
            chlorine24_72h,
            pressure24_72h,
            flowRate24_72h,
            chlorine72h,
            pressure72h,
            flowRate72h
          ] = await Promise.all([
            getAttributeValue(esr.WebId, 'Chlorine'),
            getAttributeValue(esr.WebId, 'Pressure'),
            getAttributeValue(esr.WebId, 'Flow Rate'),
            getAttributeValue(esr.WebId, 'Communication Status - Chlorine - 24hr'),
            getAttributeValue(esr.WebId, 'Communication Status - Pressure - 24hr'),
            getAttributeValue(esr.WebId, 'Communication Status - Flow Rate - 24hr'),
            getAttributeValue(esr.WebId, 'Communication Status - Chlorine - 24hr - 72hr'),
            getAttributeValue(esr.WebId, 'Communication Status - Pressure - 24hr - 72hr'),
            getAttributeValue(esr.WebId, 'Communication Status - Flow Rate - 24hr - 72hr'),
            getAttributeValue(esr.WebId, 'Communication Status - Chlorine - 72hr'),
            getAttributeValue(esr.WebId, 'Communication Status - Pressure - 72hr'),
            getAttributeValue(esr.WebId, 'Communication Status - Flow Rate - 72hr')
          ]);

          const record: any = {
            region: hierarchy.region,
            circle: hierarchy.circle,
            division: hierarchy.division,
            sub_division: hierarchy.sub_division,
            block: hierarchy.block,
            scheme_id: hierarchy.scheme_id,
            scheme_name: hierarchy.scheme_name,
            village_name: hierarchy.village_name,
            esr_name: hierarchy.esr_name,
          };

          const chlorine_connected = checkConnected(chlorineVal);
          if (chlorine_connected) record.chlorine_connected = chlorine_connected;

          const pressure_connected = checkConnected(pressureVal);
          if (pressure_connected) record.pressure_connected = pressure_connected;

          const flow_meter_connected = checkConnected(flowRateVal);
          if (flow_meter_connected) record.flow_meter_connected = flow_meter_connected;

          const chlorine_status = mapStatus24h(chlorine24h);
          if (chlorine_status) record.chlorine_status = chlorine_status;

          const pressure_status = mapStatus24h(pressure24h);
          if (pressure_status) record.pressure_status = pressure_status;

          const flow_meter_status = mapStatus24h(flowRate24h);
          if (flow_meter_status) record.flow_meter_status = flow_meter_status;

          const chlorine_0h_72h = mapStatus72h(chlorine24_72h);
          if (chlorine_0h_72h) record.chlorine_0h_72h = chlorine_0h_72h;

          const pressure_0h_72h = mapStatus72h(pressure24_72h);
          if (pressure_0h_72h) record.pressure_0h_72h = pressure_0h_72h;

          const flow_meter_0h_72h = mapStatus72h(flowRate24_72h);
          if (flow_meter_0h_72h) record.flow_meter_0h_72h = flow_meter_0h_72h;

          const chlorine_72h = mapStatus72h(chlorine72h);
          if (chlorine_72h) record.chlorine_72h = chlorine_72h;

          const pressure_72h = mapStatus72h(pressure72h);
          if (pressure_72h) record.pressure_72h = pressure_72h;

          const flow_meter_72h = mapStatus72h(flowRate72h);
          if (flow_meter_72h) record.flow_meter_72h = flow_meter_72h;

          // Determine overall status based on existing components
          // Simplistic fallback or let existing logic handle it.
          // The request doesn't explicitly mention overall_status, so we skip modifying it
          // or we just let it be. We will not set it explicitly here.

          // Using onConflictDoUpdate while strictly omitting timestamp logic
          await db.insert(communicationStatus).values(record).onConflictDoUpdate({
            target: [
              communicationStatus.scheme_id,
              communicationStatus.village_name,
              communicationStatus.esr_name
            ],
            set: record // record only contains mapped fields, leaving last_seen and uploaded_at completely untouched
          });

          successCount++;
          if (successCount % 50 === 0) {
            console.log(`Processed ${successCount} ESRs for Communication Status...`);
          }

        } catch (err) {
          console.error(`Failed to process Communication Status for ESR ${esr.Name}:`, err instanceof Error ? err.message : String(err));
          errorCount++;
        }
      }));

      console.log(`Processed Communication Status batch ${Math.floor(i / BATCH_SIZE) + 1} / ${Math.ceil(esrs.length / BATCH_SIZE)}`);
    }

    console.log(`PI Communication Status Ingestion Complete. Success: ${successCount}, Errors: ${errorCount}`);
    return { success: true, processed: successCount, errors: errorCount };

  } catch (err) {
    console.error("Critical error in PI Communication Status Ingestion:", err instanceof Error ? err.message : err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

import cron from "node-cron";

export function initPiCommunicationStatusIngestionCron() {
  cron.schedule("29 11 * * *", async () => {
    console.log("Running scheduled PI Web API Communication Status Ingestion...");
    await runPiCommunicationStatusIngestion();
  });
  console.log("PI Communication Status Ingestion Cron initialized (runs at 12:45 daily)");
}
