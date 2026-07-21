import { getDB } from "../db";
import { eq, and } from "drizzle-orm";
import { pressureData, pressureHistory, InsertPressureData, InsertPressureHistory } from "@shared/schema";
import {
  getAllESRs,
  getAttributeSummaryData,
  getAttributeRecordedData,
  updateCommunicationStatus,
  piClient,
  extractHierarchyFromPath,
  PIElement
} from "../services/pi-web-api-service";
import { format, subDays, isDate, parseISO } from "date-fns";

export async function runPiPressureIngestion(rootPath?: string) {
  console.log("Starting PI Web API Pressure Data Ingestion...");

  try {
    const db = await getDB();
    // 1. Get all ESRs
    const esrs: PIElement[] = await getAllESRs(rootPath);
    console.log(`Found ${esrs.length} ESRs in PI AF.`);

    const today = new Date();
    const batchId = `pi-sync-${Date.now()}`;
    let successCount = 0;
    let errorCount = 0;

    // 2. Process each ESR in parallel batches
    const BATCH_SIZE = 4;

    for (let i = 0; i < esrs.length; i += BATCH_SIZE) {
      const batch = esrs.slice(i, i + BATCH_SIZE);

      await Promise.all(batch.map(async (esr) => {
        try {
          const hierarchy = extractHierarchyFromPath(esr.Path);

          // Skip if vital hierarchy is missing
          if (!hierarchy.scheme_id || !hierarchy.esr_name) {
            console.warn(`Skipping ESR with invalid path: ${esr.Path}`);
            return;
          }

          // Fetch daily maximums for 'Pressure' for the last 7 days + 1 extra using the summary endpoint
          const pressureDataPoints = await getAttributeSummaryData(esr.WebId, 'Pressure', 7, 'Maximum');

          // Map the points to an array of 7 values, ordered from oldest (Day 1) to most recent (Day 7)
          const values: number[] = [];
          const dates: string[] = [];

          let hasOnlyPtCreated = false;
          const dateMap = new Map<string, number>();
          if (pressureDataPoints && pressureDataPoints.length > 0) {
            let totalBuckets = 0;
            let ptCreatedCount = 0;

            for (const summaryItem of pressureDataPoints) {
              const pt = summaryItem.Value;
              if (pt) {
                totalBuckets++;

                // Check if this bucket is "Pt Created"
                const isPtCreated = pt.IsSystem || pt.Name === 'Pt Created' || pt.Value === 253 || pt.Value === 255 ||
                  (typeof pt.Value === 'object' && (pt.Value.IsSystem || pt.Value.Name === 'Pt Created'));

                if (isPtCreated) {
                  ptCreatedCount++;
                } else if (typeof pt.Value === 'number' && pt.Good !== false) {
                  // Only valid numbers make it to the dateMap
                  const bucketTimestamp = pt.Timestamp;
                  const dateObj = new Date(bucketTimestamp);
                  const dateStr = format(dateObj, "dd-MMM");
                  dateMap.set(dateStr, pt.Value);
                }
              }
            }

            if (totalBuckets > 0 && ptCreatedCount === totalBuckets) {
              hasOnlyPtCreated = true;
            }
          }

          if (pressureDataPoints === null || hasOnlyPtCreated) {
            // If the Pressure attribute physically doesn't exist, OR it only has "Pt Created" values, remove it from DB
            await db.delete(pressureData).where(
              and(
                eq(pressureData.scheme_id, hierarchy.scheme_id),
                eq(pressureData.village_name, hierarchy.village_name),
                eq(pressureData.esr_name, hierarchy.esr_name)
              )
            );
            return;
          }

          for (let i = 0; i < 7; i++) {
            const expectedDate = format(subDays(today, 7 - i), "dd-MMM");
            dates.push(expectedDate);
            values.push(dateMap.get(expectedDate) || 0);
          }

          // Calculate analytics
          let consistentZero = 0;
          let lessThan02 = 0;
          let between0207 = 0;
          let greaterThan07 = 0;

          for (const val of values) {
            if (val === 0) consistentZero++;
            if (val < 0.2) lessThan02++;
            if (val >= 0.2 && val <= 0.7) between0207++;
            if (val > 0.7) greaterThan07++;
          }

          // Prepare the record
          const record: InsertPressureData = {
            region: hierarchy.region,
            circle: hierarchy.circle,
            division: hierarchy.division,
            sub_division: hierarchy.sub_division,
            block: hierarchy.block,
            scheme_id: hierarchy.scheme_id,
            scheme_name: hierarchy.scheme_name,
            village_name: hierarchy.village_name,
            esr_name: hierarchy.esr_name,

            pressure_value_1: values[0].toString(),
            pressure_value_2: values[1].toString(),
            pressure_value_3: values[2].toString(),
            pressure_value_4: values[3].toString(),
            pressure_value_5: values[4].toString(),
            pressure_value_6: values[5].toString(),
            pressure_value_7: values[6].toString(),

            pressure_date_day_1: dates[0],
            pressure_date_day_2: dates[1],
            pressure_date_day_3: dates[2],
            pressure_date_day_4: dates[3],
            pressure_date_day_5: dates[4],
            pressure_date_day_6: dates[5],
            pressure_date_day_7: dates[6],

            number_of_consistent_zero_value_in_pressure: consistentZero,
            pressure_less_than_02_bar: lessThan02.toString(),
            pressure_between_02_07_bar: between0207.toString(),
            pressure_greater_than_07_bar: greaterThan07.toString(),

            dashboard_url: `https://mahajaliot.in/PIVision/#/Displays/10086/CEREBULB_JJM_MAHARASHTRA_ESR_LEVEL_DASHBOARD?hidetoolbar=true&hidesidebar=true&mode=kiosk&asset=${encodeURIComponent(esr.Path)}`
          };

          // Upsert into pressure_data table
          await db.insert(pressureData).values(record).onConflictDoUpdate({
            target: [pressureData.scheme_id, pressureData.village_name, pressureData.esr_name],
            set: record
          });

          // Insert into pressure_history table for the current day (Day 1)
          const historyRecord: InsertPressureHistory = {
            region: hierarchy.region,
            circle: hierarchy.circle,
            division: hierarchy.division,
            sub_division: hierarchy.sub_division,
            block: hierarchy.block,
            scheme_id: hierarchy.scheme_id,
            scheme_name: hierarchy.scheme_name,
            village_name: hierarchy.village_name,
            esr_name: hierarchy.esr_name,
            pressure_date: dates[0],
            pressure_value: values[0].toString(),
            upload_batch_id: batchId,
            dashboard_url: record.dashboard_url
          };

          await db.insert(pressureHistory).values(historyRecord).onConflictDoNothing({
            target: [
              pressureHistory.scheme_id,
              pressureHistory.village_name,
              pressureHistory.esr_name,
              pressureHistory.pressure_date,
              pressureHistory.uploaded_at
            ]
          });

          successCount++;
          if (successCount % 50 === 0) {
            console.log(`Processed ${successCount} ESRs...`);
          }

        } catch (err) {
          console.error(`Failed to process ESR ${esr.Name}:`, err instanceof Error ? err.message : String(err));
          errorCount++;
        }
      }));

      console.log(`Processed batch ${Math.floor(i / BATCH_SIZE) + 1} / ${Math.ceil(esrs.length / BATCH_SIZE)}`);
    }

    console.log(`PI Pressure Ingestion Complete. Success: ${successCount}, Errors: ${errorCount}`);
    return { success: true, processed: successCount, errors: errorCount };

  } catch (err) {
    console.error("Critical error in PI Pressure Ingestion:", err instanceof Error ? err.message : err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

import cron from "node-cron";

export function initPiPressureIngestionCron() {
  cron.schedule("25 11 * * *", async () => {
    console.log("Running scheduled PI Web API Pressure Data Ingestion...");
    await runPiPressureIngestion();
  });
  console.log("PI Pressure Ingestion Cron initialized (runs at 12:38 daily)");
}
