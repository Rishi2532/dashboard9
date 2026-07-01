import { getDB } from "../db";
import { schemeLpcd, schemeLpcdDataHistory, InsertSchemeLpcd, InsertSchemeLpcdDataHistory } from "@shared/schema";
import { findElementsByTemplate, getAttributeSummaryData, getAttributeRecordedData, extractHierarchyFromPath } from "../services/pi-web-api-service";
import { format, subDays, parseISO } from "date-fns";
import cron from "node-cron";

export async function runPiSchemeLpcdIngestion(rootPath?: string) {
  console.log("Starting PI Web API Scheme LPCD Ingestion...");
  const defaultPath = "\\\\DemoAF\\JJM\\JJM\\Maharashtra";
  try {
    const db = await getDB();
    const schemes = await findElementsByTemplate(rootPath || defaultPath, "MJP Scheme Level - Active");
    console.log(`Found ${schemes.length} Schemes in PI AF.`);

    const today = new Date();
    const batchId = `pi-sync-scheme-${Date.now()}`;
    let successCount = 0;
    let errorCount = 0;

    const BATCH_SIZE = 10;

    for (let i = 0; i < schemes.length; i += BATCH_SIZE) {
      const batch = schemes.slice(i, i + BATCH_SIZE);

      await Promise.all(batch.map(async (scheme) => {
        try {
          const hierarchy = extractHierarchyFromPath(scheme.Path);
          if (!hierarchy.scheme_id) return;

          const waterPoints = await getAttributeRecordedData(scheme.WebId, 'Calc - Water Consumption per Day For LPCD', 't-7d', 't%2B1d');
          const lpcdPoints = await getAttributeRecordedData(scheme.WebId, 'Calc - Liter Per Capita Day', 't-7d', 't%2B1d');
          const popPoints = await getAttributeSummaryData(scheme.WebId, 'Population', 1, 'Maximum');
          const villagePoints = await getAttributeSummaryData(scheme.WebId, 'Number of Village', 1, 'Maximum');

          let population = 0;
          if (popPoints && popPoints.length > 0 && popPoints[0].Value) {
            population = typeof popPoints[0].Value.Value === 'number' ? popPoints[0].Value.Value : 0;
          }
          let totalVillages = 0;
          if (villagePoints && villagePoints.length > 0 && villagePoints[0].Value) {
            totalVillages = typeof villagePoints[0].Value.Value === 'number' ? villagePoints[0].Value.Value : 0;
          }

          const processPoints = (points: any[]) => {
            const vals: number[] = [];
            const dts: string[] = [];
            const dateMap = new Map<string, number>();

            if (points && points.length > 0) {
              for (const pt of points) {
                // For /recorded, pt.Value is the actual number and pt.Good indicates validity
                if (typeof pt.Value === 'number' && pt.Good !== false) {
                  const bucketTimestamp = pt.Timestamp;
                  // Use the timestamp exactly as it comes
                  let dateObj = subDays(new Date(bucketTimestamp), 1);
                  const dateStr = format(dateObj, "dd-MMM");
                  dateMap.set(dateStr, pt.Value);
                }
              }
            }

            // Map the last 7 days strictly by date
            for (let i = 0; i < 7; i++) {
              const expectedDate = format(subDays(today, 7 - i), "dd-MMM");
              dts.push(expectedDate);
              vals.push(dateMap.get(expectedDate) || 0);
            }
            return { vals, dts };
          };

          const water = processPoints(waterPoints || []);
          const lpcd = processPoints(lpcdPoints || []);

          let zeroLpcdCount = 0;
          let below55Count = 0;
          let above55Count = 0;
          for (const val of lpcd.vals) {
            if (val === 0) zeroLpcdCount++;
            else if (val > 0 && val < 55) below55Count++;
            else if (val >= 55) above55Count++;
          }

          const record: InsertSchemeLpcd = {
            region: hierarchy.region,
            circle: hierarchy.circle,
            division: hierarchy.division,
            sub_division: hierarchy.sub_division,
            block: hierarchy.block,
            scheme_id: hierarchy.scheme_id,
            scheme_name: hierarchy.scheme_name,

            population,
            total_villages: totalVillages,

            water_value_day1: water.vals[0].toString(),
            water_value_day2: water.vals[1].toString(),
            water_value_day3: water.vals[2].toString(),
            water_value_day4: water.vals[3].toString(),
            water_value_day5: water.vals[4].toString(),
            water_value_day6: water.vals[5].toString(),
            water_value_day7: water.vals[6].toString(),

            lpcd_value_day1: lpcd.vals[0].toString(),
            lpcd_value_day2: lpcd.vals[1].toString(),
            lpcd_value_day3: lpcd.vals[2].toString(),
            lpcd_value_day4: lpcd.vals[3].toString(),
            lpcd_value_day5: lpcd.vals[4].toString(),
            lpcd_value_day6: lpcd.vals[5].toString(),
            lpcd_value_day7: lpcd.vals[6].toString(),

            water_date_day1: water.dts[0],
            water_date_day2: water.dts[1],
            water_date_day3: water.dts[2],
            water_date_day4: water.dts[3],
            water_date_day5: water.dts[4],
            water_date_day6: water.dts[5],
            water_date_day7: water.dts[6],

            lpcd_date_day1: lpcd.dts[0],
            lpcd_date_day2: lpcd.dts[1],
            lpcd_date_day3: lpcd.dts[2],
            lpcd_date_day4: lpcd.dts[3],
            lpcd_date_day5: lpcd.dts[4],
            lpcd_date_day6: lpcd.dts[5],
            lpcd_date_day7: lpcd.dts[6],

            consistent_zero_lpcd_for_a_week: zeroLpcdCount === 7 ? 1 : 0,
            below_55_lpcd_count: below55Count,
            above_55_lpcd_count: above55Count,
            dashboard_url: `https://mahajaliot.in/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD?hidetoolbar=true&hidesidebar=true&mode=kiosk&asset=${encodeURIComponent(scheme.Path.replace(/\\\\/g, '\\'))}`
          };

          await db.insert(schemeLpcd).values(record).onConflictDoUpdate({
            target: [schemeLpcd.scheme_id, schemeLpcd.block],
            set: record
          });

          const historyRecord: InsertSchemeLpcdDataHistory = {
            region: hierarchy.region,
            circle: hierarchy.circle,
            division: hierarchy.division,
            sub_division: hierarchy.sub_division,
            block: hierarchy.block,
            scheme_id: hierarchy.scheme_id,
            scheme_name: hierarchy.scheme_name,
            population,
            total_villages: totalVillages,
            data_date: water.dts[0],
            water_value: water.vals[0].toString(),
            lpcd_value: lpcd.vals[0].toString(),
            upload_batch_id: batchId,
            dashboard_url: record.dashboard_url
          };

          await db.insert(schemeLpcdDataHistory).values(historyRecord).onConflictDoNothing({
            target: [schemeLpcdDataHistory.scheme_id, schemeLpcdDataHistory.block, schemeLpcdDataHistory.data_date]
          });

          successCount++;
        } catch (err) {
          console.error(`Failed to process Scheme ${scheme.Name}:`, err instanceof Error ? err.message : String(err));
          errorCount++;
        }
      }));
    }
    console.log(`PI Scheme LPCD Ingestion Complete. Success: ${successCount}, Errors: ${errorCount}`);
  } catch (err) {
    console.error("Error in PI Scheme LPCD Ingestion:", err);
  }
}

export function initPiSchemeLpcdIngestionCron() {
  cron.schedule("38 09 * * *", async () => {
    console.log("Running scheduled PI Web API Scheme LPCD Data Ingestion...");
    await runPiSchemeLpcdIngestion();
  });
  console.log("PI Scheme LPCD Ingestion Cron initialized (runs at 15:29 daily)");
}
