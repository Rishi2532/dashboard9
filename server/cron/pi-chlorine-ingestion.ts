import { getDB } from "../db";
import { eq, and } from "drizzle-orm";
import { chlorineData, chlorineHistory, InsertChlorineData, InsertChlorineHistory } from "@shared/schema";
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

export async function runPiChlorineIngestion(rootPath?: string) {
  console.log("Starting PI Web API Chlorine Data Ingestion...");

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

          // Fetch daily maximums for 'Chlorine' for the last 7 days + 1 extra using the summary endpoint
          const chlorineDataPoints = await getAttributeSummaryData(esr.WebId, 'Chlorine', 7, 'Maximum');

          // Map the points to an array of 7 values, ordered from oldest (Day 1) to most recent (Day 7)
          const values: number[] = [];
          const dates: string[] = [];

          const dateMap = new Map<string, number>();
          if (chlorineDataPoints && chlorineDataPoints.length > 0) {
            for (const summaryItem of chlorineDataPoints) {
              const pt = summaryItem.Value;
              if (pt && typeof pt.Value === 'number' && pt.Good !== false && !pt.IsSystem && pt.Name !== 'Pt Created' && pt.Value !== 253 && pt.Value !== 255 && (!pt.Value || (pt.Value.IsSystem !== true && pt.Value.Name !== 'Pt Created'))) {
                const bucketTimestamp = pt.Timestamp;
                const dateObj = new Date(bucketTimestamp);
                const dateStr = format(dateObj, "dd-MMM");
                dateMap.set(dateStr, pt.Value);
              }
            }
          }

          if (dateMap.size === 0) {
            // If no valid data was found (e.g., entirely 'Pt Created'), remove it from DB so it drops off the dashboard
            await db.delete(chlorineData).where(
              and(
                eq(chlorineData.scheme_id, hierarchy.scheme_id),
                eq(chlorineData.village_name, hierarchy.village_name),
                eq(chlorineData.esr_name, hierarchy.esr_name)
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
          let between0205 = 0;
          let greaterThan05 = 0;

          for (const val of values) {
            if (val === 0) consistentZero++;
            if (val < 0.2) lessThan02++;
            if (val >= 0.2 && val <= 0.5) between0205++;
            if (val > 0.5) greaterThan05++;
          }

          // Prepare the record
          const record: InsertChlorineData = {
            region: hierarchy.region,
            circle: hierarchy.circle,
            division: hierarchy.division,
            sub_division: hierarchy.sub_division,
            block: hierarchy.block,
            scheme_id: hierarchy.scheme_id,
            scheme_name: hierarchy.scheme_name,
            village_name: hierarchy.village_name,
            esr_name: hierarchy.esr_name,

            chlorine_value_1: values[0].toString(),
            chlorine_value_2: values[1].toString(),
            chlorine_value_3: values[2].toString(),
            chlorine_value_4: values[3].toString(),
            chlorine_value_5: values[4].toString(),
            chlorine_value_6: values[5].toString(),
            chlorine_value_7: values[6].toString(),

            chlorine_date_day_1: dates[0],
            chlorine_date_day_2: dates[1],
            chlorine_date_day_3: dates[2],
            chlorine_date_day_4: dates[3],
            chlorine_date_day_5: dates[4],
            chlorine_date_day_6: dates[5],
            chlorine_date_day_7: dates[6],

            number_of_consistent_zero_value_in_chlorine: consistentZero,
            chlorine_less_than_02_mgl: lessThan02.toString(),
            chlorine_between_02_05_mgl: between0205.toString(),
            chlorine_greater_than_05_mgl: greaterThan05.toString(),

            dashboard_url: `https://mahajaliot.in/PIVision/#/Displays/10086/CEREBULB_JJM_MAHARASHTRA_ESR_LEVEL_DASHBOARD?hidetoolbar=true&hidesidebar=true&mode=kiosk&asset=${encodeURIComponent(esr.Path)}`
          };

          // Upsert into chlorine_data table
          await db.insert(chlorineData).values(record).onConflictDoUpdate({
            target: [chlorineData.scheme_id, chlorineData.village_name, chlorineData.esr_name],
            set: record
          });

          // Insert into chlorine_history table for the current day (Day 1)
          const historyRecord: InsertChlorineHistory = {
            region: hierarchy.region,
            circle: hierarchy.circle,
            division: hierarchy.division,
            sub_division: hierarchy.sub_division,
            block: hierarchy.block,
            scheme_id: hierarchy.scheme_id,
            scheme_name: hierarchy.scheme_name,
            village_name: hierarchy.village_name,
            esr_name: hierarchy.esr_name,
            chlorine_date: dates[0],
            chlorine_value: values[0].toString(),
            upload_batch_id: batchId,
            dashboard_url: record.dashboard_url
          };

          await db.insert(chlorineHistory).values(historyRecord).onConflictDoNothing({
            target: [
              chlorineHistory.scheme_id,
              chlorineHistory.village_name,
              chlorineHistory.esr_name,
              chlorineHistory.chlorine_date,
              chlorineHistory.uploaded_at
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

    console.log(`PI Chlorine Ingestion Complete. Success: ${successCount}, Errors: ${errorCount}`);
    return { success: true, processed: successCount, errors: errorCount };

  } catch (err) {
    console.error("Critical error in PI Chlorine Ingestion:", err instanceof Error ? err.message : err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

import cron from "node-cron";

export function initPiChlorineIngestionCron() {
  cron.schedule("52 11 * * *", async () => {
    console.log("Running scheduled PI Web API Chlorine Data Ingestion...");
    await runPiChlorineIngestion();
  });
  console.log("PI Chlorine Ingestion Cron initialized (runs at 12:37 daily)");
}
