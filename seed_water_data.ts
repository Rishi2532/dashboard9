import { pool } from "./server/db-local";
import { format, subDays } from "date-fns";

async function seedWaterData() {
  console.log("Seeding dummy water consumption data...");
  try {
    const chlorineRes = await pool.query("SELECT DISTINCT scheme_id, esr_name, chlorine_date FROM chlorine_history");
    
    if (chlorineRes.rows.length === 0) {
        console.log("No chlorine data found to seed from.");
        process.exit(1);
    }

    let count = 0;
    for (const row of chlorineRes.rows) {
        // Randomly simulate a positive water supply value (e.g., 50 to 500)
        const waterValue = Math.floor(Math.random() * (500 - 50 + 1) + 50);

        await pool.query(`
          INSERT INTO water_consumption_history 
          (scheme_id, esr_name, data_date, water_value, region, circle, division, sub_division, block, scheme_name, village_name, esr_capacity, flow_rate_m3, dashboard_url, upload_batch_id)
          VALUES ($1, $2, $3, $4, 'Pune', 'Pune', 'Pune', 'Pune', 'Purandar', 'Dummy', 'Dummy', '0', '0', '', 'test-seed')
          ON CONFLICT (scheme_id, village_name, esr_name, data_date, uploaded_at) DO NOTHING
        `, [row.scheme_id, row.esr_name, row.chlorine_date, waterValue]);
        
        count++;
        if (count % 1000 === 0) console.log(`Seeded ${count} water consumption records...`);
    }

    console.log(`Finished seeding ${count} water consumption records!`);
  } catch (err) {
    console.error("Error seeding:", err);
  } finally {
    process.exit(0);
  }
}

seedWaterData();
