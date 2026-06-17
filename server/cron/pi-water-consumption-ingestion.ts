import { getDB } from "../db";
import { waterConsumption, waterConsumptionHistory, InsertWaterConsumption, InsertWaterConsumptionHistory } from "@shared/schema";
import {
  getAllESRs,
  getAttributeSummaryData,
  getAttributeRecordedData,
  getAttributeValue,
  extractHierarchyFromPath
} from "../services/pi-web-api-service";
import { format, subDays, parseISO } from "date-fns";
import cron from "node-cron";

export async function runPiWaterConsumptionIngestion(rootPath?: string) {
  console.log("Starting PI Web API Water Consumption Ingestion...");
  try {
    const db = await getDB();
    const esrs = await getAllESRs(rootPath);
    console.log(`Found ${esrs.length} ESRs in PI AF.`);

    const today = new Date();
    const batchId = `pi-sync-flow-${Date.now()}`;
    let successCount = 0;
    let errorCount = 0;

    const BATCH_SIZE = 4;

    for (let i = 0; i < esrs.length; i += BATCH_SIZE) {
      const batch = esrs.slice(i, i + BATCH_SIZE);

      await Promise.all(batch.map(async (esr) => {
        try {
          const hierarchy = extractHierarchyFromPath(esr.Path);
          if (!hierarchy.scheme_id || !hierarchy.esr_name) return;

          const flowRatePoints = await getAttributeSummaryData(esr.WebId, 'Flow Rate', 1, 'Maximum');
          const waterPoints = await getAttributeSummaryData(esr.WebId, 'CALC - WATER CONSUMPTION PER DAY', 7, 'Maximum');
          const commStatusPoints = await getAttributeSummaryData(esr.WebId, 'Communication Status - Flow Rate', 1, 'Maximum');
          const capacityData = await getAttributeValue(esr.WebId, 'Reservoir Capacity');

          let flowRate = 0;
          if (flowRatePoints && flowRatePoints.length > 0 && flowRatePoints[0].Value) {
            flowRate = typeof flowRatePoints[0].Value.Value === 'number' ? flowRatePoints[0].Value.Value : 0;
          }

          let commStatusVal = -1;
          if (commStatusPoints && commStatusPoints.length > 0 && commStatusPoints[0].Value) {
            commStatusVal = typeof commStatusPoints[0].Value.Value === 'number' ? commStatusPoints[0].Value.Value : -1;
          }

          let onlineStatus = "Offline";
          let flowMeterConnected = "Not connected";
          if (commStatusVal === 2) {
            onlineStatus = "Online";
            flowMeterConnected = "connected";
          } else if (commStatusVal === 0) {
            onlineStatus = "Offline";
            flowMeterConnected = "connected";
          }

          let esrCapacity = 0;
          if (capacityData !== null && capacityData !== undefined) {
            if (typeof capacityData === 'number') {
              esrCapacity = capacityData;
            } else if (typeof capacityData === 'string') {
              esrCapacity = parseFloat(capacityData.replace(/[a-zA-Z]+/g, '')) || 0;
            }
          }

          const processPoints = (points: any[]) => {
            const vals: number[] = [];
            const dts: string[] = [];
            const dateMap = new Map<string, number>();

            if (points && points.length > 0) {
              for (const summaryItem of points) {
                const pt = summaryItem.Value;
                if (pt && typeof pt.Value === 'number' && pt.Good !== false) {
                  const bucketTimestamp = pt.Timestamp;
                  // Shift the date back by 1 day since data for the day is timestamped at 12 AM the next day
                  const dateObj = new Date(bucketTimestamp);
                  const dateStr = format(dateObj, "dd-MMM");
                  dateMap.set(dateStr, pt.Value);
                }
              }
            }

            for (let j = 0; j < 7; j++) {
              const expectedDate = format(subDays(today, 7 - j), "dd-MMM");
              dts.push(expectedDate);
              vals.push(dateMap.get(expectedDate) || 0);
            }
            return { vals, dts };
          };

          const water = processPoints(waterPoints || []);

          let zeroCount = 0;
          for (const val of water.vals) {
            if (val === 0) zeroCount++;
          }

          const record: InsertWaterConsumption = {
            region: hierarchy.region,
            circle: hierarchy.circle,
            division: hierarchy.division,
            sub_division: hierarchy.sub_division,
            block: hierarchy.block,
            scheme_id: hierarchy.scheme_id,
            scheme_name: hierarchy.scheme_name,
            village_name: hierarchy.village_name,
            esr_name: hierarchy.esr_name,

            flow_rate_m3: flowRate.toString(),
            time_duration: "0",
            online_status: onlineStatus,
            flow_meter_connected: flowMeterConnected,
            esr_capacity: esrCapacity.toString(),

            water_value_day1: water.vals[0].toString(),
            water_value_day2: water.vals[1].toString(),
            water_value_day3: water.vals[2].toString(),
            water_value_day4: water.vals[3].toString(),
            water_value_day5: water.vals[4].toString(),
            water_value_day6: water.vals[5].toString(),
            water_value_day7: water.vals[6].toString(),

            water_date_day1: water.dts[0],
            water_date_day2: water.dts[1],
            water_date_day3: water.dts[2],
            water_date_day4: water.dts[3],
            water_date_day5: water.dts[4],
            water_date_day6: water.dts[5],
            water_date_day7: water.dts[6],

            flow_rate_m3: flowRatePoints?.[0]?.Value?.Value?.toString() || "0",

            consistent_zero_consumption: zeroCount === 7 ? 1 : 0,

            dashboard_url: `https://mahajaliot.in/PIVision/#/Displays/10086/CEREBULB_JJM_MAHARASHTRA_ESR_LEVEL_DASHBOARD?hidetoolbar=true&hidesidebar=true&mode=kiosk&asset=${encodeURIComponent(esr.Path)}`
          };

          await db.insert(waterConsumption).values(record).onConflictDoUpdate({
            target: [waterConsumption.scheme_id, waterConsumption.village_name, waterConsumption.esr_name],
            set: record
          });

          const historyRecord: InsertWaterConsumptionHistory = {
            region: hierarchy.region,
            circle: hierarchy.circle,
            division: hierarchy.division,
            sub_division: hierarchy.sub_division,
            block: hierarchy.block,
            scheme_id: hierarchy.scheme_id,
            scheme_name: hierarchy.scheme_name,
            village_name: hierarchy.village_name,
            esr_name: hierarchy.esr_name,
            data_date: water.dts[0],
            water_value: water.vals[0].toString(),
            flow_rate_m3: flowRate.toString(),
            esr_capacity: esrCapacity.toString(),
            upload_batch_id: batchId,
            dashboard_url: record.dashboard_url
          };

          await db.insert(waterConsumptionHistory).values(historyRecord).onConflictDoNothing({
            target: [waterConsumptionHistory.scheme_id, waterConsumptionHistory.village_name, waterConsumptionHistory.esr_name, waterConsumptionHistory.data_date, waterConsumptionHistory.uploaded_at]
          });

          successCount++;
        } catch (err) {
          console.error(`Failed to process ESR Consumption ${esr.Name}:`, err instanceof Error ? err.message : String(err));
          errorCount++;
        }
      }));
    }
    console.log(`PI Water Consumption Ingestion Complete. Success: ${successCount}, Errors: ${errorCount}`);
  } catch (err) {
    console.error("Error in PI Water Consumption Ingestion:", err);
  }
}

export function initPiWaterConsumptionIngestionCron() {
  // Run daily at 09:51 AM
  cron.schedule("30 15 * * *", async () => {
    console.log("Running scheduled PI Web API Water Consumption Ingestion...");
    await runPiWaterConsumptionIngestion();
  });
  console.log("PI Water Consumption Ingestion Cron initialized (runs at 17:58 daily)");
}
