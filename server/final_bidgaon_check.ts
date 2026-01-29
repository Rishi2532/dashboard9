
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const week1Dates = ["29-Dec", "30-Dec", "31-Dec", "01-Jan", "02-Jan", "03-Jan", "04-Jan"];

async function run() {
  try {
    console.log("Analyzing Bidgaon for Week 1 (29-Dec-2025 to 04-Jan-2026)");

    // 1. Village Data
    const villageQuery = `
      SELECT village_name, scheme_id, region, data_date, lpcd_value
      FROM water_scheme_data_history
      WHERE (village_name ILIKE '%Bidgaon%' OR village_name ILIKE '%Bifgaon%')
        AND data_date IN (${week1Dates.map(d => `'${d}'`).join(',')})
      ORDER BY CASE 
        WHEN data_date LIKE '%Dec' THEN 0 
        WHEN data_date LIKE '%Jan' THEN 1 
      END, data_date ASC
    `;
    const villageRes = await pool.query(villageQuery);
    console.log("\n--- Bidgaon Village Stats ---");
    if (villageRes.rows.length === 0) {
      console.log("No village data found.");
    } else {
      console.table(villageRes.rows);
      const values = villageRes.rows.map(r => parseFloat(r.lpcd_value || 0));
      const total = values.reduce((sum, v) => sum + v, 0);
      const avg = total / 7; // Average over 7 days of the week
      console.log(`Sum of LPCD (7 days): ${total.toFixed(2)}`);
      console.log(`Average LPCD (Total/7): ${avg.toFixed(2)}`);
      console.log(`Classification: ${avg > 55 ? '>55' : avg > 0 ? '<55' : 'No Water'}`);
    }

    // 2. Scheme Data
    const schemeQuery = `
      SELECT scheme_name, scheme_id, region, data_date, lpcd_value
      FROM scheme_lpcd_data_history
      WHERE scheme_name ILIKE '%Bidgaon%'
        AND data_date IN (${week1Dates.map(d => `'${d}'`).join(',')})
      ORDER BY CASE 
        WHEN data_date LIKE '%Dec' THEN 0 
        WHEN data_date LIKE '%Jan' THEN 1 
      END, data_date ASC
    `;
    const schemeRes = await pool.query(schemeQuery);
    console.log("\n--- Bidgaon Tarodi WSS Scheme Stats ---");
    if (schemeRes.rows.length === 0) {
      console.log("No scheme data found.");
    } else {
      console.table(schemeRes.rows);
      const values = schemeRes.rows.map(r => parseFloat(r.lpcd_value || 0));
      const total = values.reduce((sum, v) => sum + v, 0);
      const avg = total / 7;
      console.log(`Sum of LPCD (7 days): ${total.toFixed(2)}`);
      console.log(`Average LPCD (Total/7): ${avg.toFixed(2)}`);
      console.log(`Classification: ${avg > 55 ? '>55' : avg > 0 ? '<55' : 'No Water'}`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
