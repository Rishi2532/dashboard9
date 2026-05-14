import { parse } from "csv-parse/sync";
import { getDB } from "./db";
import { schemeLpcd, schemeLpcdDataHistory } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function importSchemeLpcdFromCSV(fileBuffer: Buffer): Promise<{
  inserted: number;
  updated: number;
  removed: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let inserted = 0;
  let updated = 0;

  try {
    const records = parse(fileBuffer, {
      delimiter: ",",
      columns: false,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_column_count: true,
    });

    if (records.length === 0) {
      return { inserted: 0, updated: 0, removed: 0, errors: ["Empty CSV"] };
    }

    // Start from index 0 to include all rows (user confirmed no headers)
    const startIndex = 0;

    for (let i = startIndex; i < records.length; i++) {
      const record = records[i];
      // skip if no scheme_id or scheme_name, or if it's a header row
      if (!record[5] || !record[6] || record[5] === "Scheme ID" || record[5] === "scheme_id") {
        continue;
      }

      try {
        const data = {
          region: record[0] || null,
          circle: record[1] || null,
          division: record[2] || null,
          sub_division: record[3] || null,
          block: record[4] || null,
          scheme_id: record[5],
          scheme_name: record[6],
          population: record[7] ? parseFloat(String(record[7]).replace(/,/g, "")) : null,
          total_villages: record[8] ? parseInt(String(record[8]).replace(/,/g, "")) : null,
          water_value_day1: record[9] ? parseFloat(String(record[9]).replace(/,/g, "")) : null,
          water_value_day2: record[10] ? parseFloat(String(record[10]).replace(/,/g, "")) : null,
          water_value_day3: record[11] ? parseFloat(String(record[11]).replace(/,/g, "")) : null,
          water_value_day4: record[12] ? parseFloat(String(record[12]).replace(/,/g, "")) : null,
          water_value_day5: record[13] ? parseFloat(String(record[13]).replace(/,/g, "")) : null,
          water_value_day6: record[14] ? parseFloat(String(record[14]).replace(/,/g, "")) : null,
          water_value_day7: record[15] ? parseFloat(String(record[15]).replace(/,/g, "")) : null,
          lpcd_value_day1: record[16] ? parseFloat(String(record[16]).replace(/,/g, "")) : null,
          lpcd_value_day2: record[17] ? parseFloat(String(record[17]).replace(/,/g, "")) : null,
          lpcd_value_day3: record[18] ? parseFloat(String(record[18]).replace(/,/g, "")) : null,
          lpcd_value_day4: record[19] ? parseFloat(String(record[19]).replace(/,/g, "")) : null,
          lpcd_value_day5: record[20] ? parseFloat(String(record[20]).replace(/,/g, "")) : null,
          lpcd_value_day6: record[21] ? parseFloat(String(record[21]).replace(/,/g, "")) : null,
          lpcd_value_day7: record[22] ? parseFloat(String(record[22]).replace(/,/g, "")) : null,
          water_date_day1: record[23] || null,
          water_date_day2: record[24] || null,
          water_date_day3: record[25] || null,
          water_date_day4: record[26] || null,
          water_date_day5: record[27] || null,
          water_date_day6: record[28] || null,
          water_date_day7: record[29] || null,
          lpcd_date_day1: record[30] || null,
          lpcd_date_day2: record[31] || null,
          lpcd_date_day3: record[32] || null,
          lpcd_date_day4: record[33] || null,
          lpcd_date_day5: record[34] || null,
          lpcd_date_day6: record[35] || null,
          lpcd_date_day7: record[36] || null,
        };

        const db = await getDB();
        await db.insert(schemeLpcd).values(data).onConflictDoUpdate({
          target: [schemeLpcd.scheme_id, schemeLpcd.block],
          set: data
        });
        inserted++;

        // Fetch village stats from water_scheme_data for the 7 days to populate history correctly
        const villageStatsResult = await db.execute(sql`
          SELECT 
            COUNT(DISTINCT CASE WHEN lpcd_value_day1 < 55 AND lpcd_value_day1 > 0 THEN village_name END) as below_55_day1,
            COUNT(DISTINCT CASE WHEN lpcd_value_day1 >= 55 THEN village_name END) as above_55_day1,
            COUNT(DISTINCT CASE WHEN lpcd_value_day1 = 0 OR lpcd_value_day1 IS NULL THEN village_name END) as zero_day1,
            COUNT(DISTINCT CASE WHEN lpcd_value_day2 < 55 AND lpcd_value_day2 > 0 THEN village_name END) as below_55_day2,
            COUNT(DISTINCT CASE WHEN lpcd_value_day2 >= 55 THEN village_name END) as above_55_day2,
            COUNT(DISTINCT CASE WHEN lpcd_value_day2 = 0 OR lpcd_value_day2 IS NULL THEN village_name END) as zero_day2,
            COUNT(DISTINCT CASE WHEN lpcd_value_day3 < 55 AND lpcd_value_day3 > 0 THEN village_name END) as below_55_day3,
            COUNT(DISTINCT CASE WHEN lpcd_value_day3 >= 55 THEN village_name END) as above_55_day3,
            COUNT(DISTINCT CASE WHEN lpcd_value_day3 = 0 OR lpcd_value_day3 IS NULL THEN village_name END) as zero_day3,
            COUNT(DISTINCT CASE WHEN lpcd_value_day4 < 55 AND lpcd_value_day4 > 0 THEN village_name END) as below_55_day4,
            COUNT(DISTINCT CASE WHEN lpcd_value_day4 >= 55 THEN village_name END) as above_55_day4,
            COUNT(DISTINCT CASE WHEN lpcd_value_day4 = 0 OR lpcd_value_day4 IS NULL THEN village_name END) as zero_day4,
            COUNT(DISTINCT CASE WHEN lpcd_value_day5 < 55 AND lpcd_value_day5 > 0 THEN village_name END) as below_55_day5,
            COUNT(DISTINCT CASE WHEN lpcd_value_day5 >= 55 THEN village_name END) as above_55_day5,
            COUNT(DISTINCT CASE WHEN lpcd_value_day5 = 0 OR lpcd_value_day5 IS NULL THEN village_name END) as zero_day5,
            COUNT(DISTINCT CASE WHEN lpcd_value_day6 < 55 AND lpcd_value_day6 > 0 THEN village_name END) as below_55_day6,
            COUNT(DISTINCT CASE WHEN lpcd_value_day6 >= 55 THEN village_name END) as above_55_day6,
            COUNT(DISTINCT CASE WHEN lpcd_value_day6 = 0 OR lpcd_value_day6 IS NULL THEN village_name END) as zero_day6,
            COUNT(DISTINCT CASE WHEN lpcd_value_day7 < 55 AND lpcd_value_day7 > 0 THEN village_name END) as below_55_day7,
            COUNT(DISTINCT CASE WHEN lpcd_value_day7 >= 55 THEN village_name END) as above_55_day7,
            COUNT(DISTINCT CASE WHEN lpcd_value_day7 = 0 OR lpcd_value_day7 IS NULL THEN village_name END) as zero_day7
          FROM water_scheme_data 
          WHERE scheme_id = ${data.scheme_id} AND block = ${data.block}
        `);
        const stats = villageStatsResult.rows[0] || {};

        // Also populate scheme_lpcd_data_history for each of the 7 days
        const uploadBatchId = `csv_upload_${Date.now()}`;
        
        for (let day = 1; day <= 7; day++) {
          const wValue = data[`water_value_day${day}` as keyof typeof data];
          const lValue = data[`lpcd_value_day${day}` as keyof typeof data];
          const wDate = data[`water_date_day${day}` as keyof typeof data];
          const lDate = data[`lpcd_date_day${day}` as keyof typeof data];
          
          const targetDate = lDate || wDate;
          
          if (targetDate && targetDate !== "NULL" && targetDate !== "") {
            const historyData = {
              region: data.region,
              circle: data.circle,
              division: data.division,
              sub_division: data.sub_division,
              block: data.block,
              scheme_id: data.scheme_id,
              scheme_name: data.scheme_name,
              total_population: data.population ? Math.round(data.population) : null,
              total_villages: data.total_villages,
              villages_below_55: Number(stats[`below_55_day${day}`]) || 0,
              villages_above_55: Number(stats[`above_55_day${day}`]) || 0,
              villages_zero_supply: Number(stats[`zero_day${day}`]) || 0,
              data_date: targetDate,
              water_value: wValue ? String(wValue) : null,
              lpcd_value: lValue ? String(lValue) : null,
              upload_batch_id: uploadBatchId,
            };

            await db.insert(schemeLpcdDataHistory).values(historyData).onConflictDoUpdate({
              target: [schemeLpcdDataHistory.scheme_id, schemeLpcdDataHistory.block, schemeLpcdDataHistory.data_date],
              set: {
                total_population: historyData.total_population,
                total_villages: historyData.total_villages,
                villages_below_55: historyData.villages_below_55,
                villages_above_55: historyData.villages_above_55,
                villages_zero_supply: historyData.villages_zero_supply,
                water_value: historyData.water_value,
                lpcd_value: historyData.lpcd_value,
                upload_batch_id: historyData.upload_batch_id
              }
            });
          }
        }
      } catch (err) {
        errors.push(`Row ${i + 1}: ${(err as Error).message}`);
      }
    }

    return {
      inserted,
      updated,
      removed: 0,
      errors
    };
  } catch (error) {
    errors.push(`Error parsing CSV: ${(error as Error).message}`);
    return { inserted: 0, updated: 0, removed: 0, errors };
  }
}
