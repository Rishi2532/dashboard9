import { getDB } from "../db";
import { waterSchemeData, waterSchemeDataHistory, InsertWaterSchemeData, InsertWaterSchemeDataHistory } from "@shared/schema";
import { findElementsByTemplate, getAttributeSummaryData, getAttributeRecordedData, extractHierarchyFromPath } from "../services/pi-web-api-service";
import { format, subDays, parseISO } from "date-fns";
import cron from "node-cron";

export async function runPiWaterSchemeIngestion(rootPath?: string) {
  console.log("Starting PI Web API Water Scheme (Village Level) Ingestion...");
  const defaultPath = "\\\\DemoAF\\JJM\\JJM\\Maharashtra";
  try {
    const db = await getDB();
    const villages = await findElementsByTemplate(rootPath || defaultPath, "MJP Village Level - Active");
    console.log(`Found ${villages.length} Villages in PI AF.`);

    const today = new Date();
    const batchId = `pi-sync-village-${Date.now()}`;
    let successCount = 0;
    let errorCount = 0;

    const BATCH_SIZE = 10;
    
    for (let i = 0; i < villages.length; i += BATCH_SIZE) {
      const batch = villages.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (village) => {
        try {
          const hierarchy = extractHierarchyFromPath(village.Path);
          if (!hierarchy.scheme_id || !hierarchy.village_name) return;

          // Fetch last 7 days + 1 extra day to handle boundary calculations
          const waterPoints = await getAttributeRecordedData(village.WebId, 'Calc - Water Consumption per Day For LPCD', 't-7d', 't%2B1d');
          const lpcdPoints = await getAttributeRecordedData(village.WebId, 'Calc - Liter Per Capita Day', 't-7d', 't%2B1d');
          const popPoints = await getAttributeSummaryData(village.WebId, 'Population', 1, 'Maximum');
          const esrPoints = await getAttributeSummaryData(village.WebId, 'ESR', 1, 'Maximum');
          
          let population = 0;
          if (popPoints && popPoints.length > 0 && popPoints[0].Value) {
             population = typeof popPoints[0].Value.Value === 'number' ? popPoints[0].Value.Value : 0;
          }
          let esrCount = 0;
          if (esrPoints && esrPoints.length > 0 && esrPoints[0].Value) {
             esrCount = typeof esrPoints[0].Value.Value === 'number' ? esrPoints[0].Value.Value : 0;
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
            if (val < 55 && val > 0) below55Count++;
            if (val >= 55) above55Count++;
          }

          const pathParts = village.Path.split('\\');
          const schemePath = pathParts.slice(0, 12).join('\\');

          const record: InsertWaterSchemeData = {
            region: hierarchy.region,
            circle: hierarchy.circle,
            division: hierarchy.division,
            sub_division: hierarchy.sub_division,
            block: hierarchy.block,
            scheme_id: hierarchy.scheme_id,
            scheme_name: hierarchy.scheme_name,
            village_name: hierarchy.village_name,
            
            population,
            number_of_esr: esrCount,
            
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
            dashboard_url: `https://mahajaliot.in/PIVision/#/Displays/10109/CEREBULB_JJM_MAHARASHTRA_VILLAGE_LEVEL_DASHBOARD?hidetoolbar=true&hidesidebar=true&mode=kiosk&asset=${encodeURIComponent(village.Path.replace(/\\\\/g, '\\'))}`
          };

          await db.insert(waterSchemeData).values(record).onConflictDoUpdate({
            target: [waterSchemeData.scheme_id, waterSchemeData.village_name, waterSchemeData.block],
            set: record
          });

          const historyRecord: InsertWaterSchemeDataHistory = {
            region: hierarchy.region,
            circle: hierarchy.circle,
            division: hierarchy.division,
            sub_division: hierarchy.sub_division,
            block: hierarchy.block,
            scheme_id: hierarchy.scheme_id,
            scheme_name: hierarchy.scheme_name,
            village_name: hierarchy.village_name,
            population,
            number_of_esr: esrCount,
            data_date: water.dts[0],
            water_value: water.vals[0].toString(),
            lpcd_value: lpcd.vals[0].toString(),
            upload_batch_id: batchId,
            dashboard_url: record.dashboard_url
          };

          await db.insert(waterSchemeDataHistory).values(historyRecord).onConflictDoNothing({
            target: [waterSchemeDataHistory.scheme_id, waterSchemeDataHistory.village_name, waterSchemeDataHistory.data_date, waterSchemeDataHistory.uploaded_at]
          });

          successCount++;
        } catch (err) {
          console.error(`Failed to process Village ${village.Name}:`, err instanceof Error ? err.message : String(err));
          errorCount++;
        }
      }));
    }
    console.log(`PI Water Scheme Ingestion Complete. Success: ${successCount}, Errors: ${errorCount}`);
  } catch (err) {
    console.error("Error in PI Water Scheme Ingestion:", err);
  }
}

export function initPiWaterSchemeIngestionCron() {
  // Run daily at 15:27 AM
  cron.schedule("36 10 * * *", async () => {
    console.log("Running scheduled PI Web API Water Scheme Data Ingestion...");
    await runPiWaterSchemeIngestion();
  });
  console.log("PI Water Scheme Ingestion Cron initialized (runs at 15:27 daily)");
}
