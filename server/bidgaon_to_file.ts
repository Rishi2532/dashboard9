
import dotenv from "dotenv";
import pg from "pg";
import fs from "fs";

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const week1Dates = ["29-Dec", "30-Dec", "31-Dec", "01-Jan", "02-Jan", "03-Jan", "04-Jan"];

async function run() {
  try {
    const vRes = await pool.query(`SELECT data_date, lpcd_value FROM water_scheme_data_history WHERE (village_name ILIKE '%Bidgaon%' OR village_name ILIKE '%Bifgaon%') AND data_date IN (${week1Dates.map(d => `'${d}'`).join(',')}) ORDER BY CASE WHEN data_date LIKE '%Dec' THEN 0 WHEN data_date LIKE '%Jan' THEN 1 END, data_date ASC`);
    const sRes = await pool.query(`SELECT data_date, lpcd_value FROM scheme_lpcd_data_history WHERE scheme_name ILIKE '%Bidgaon%' AND data_date IN (${week1Dates.map(d => `'${d}'`).join(',')}) ORDER BY CASE WHEN data_date LIKE '%Dec' THEN 0 WHEN data_date LIKE '%Jan' THEN 1 END, data_date ASC`);

    const output = {
        village: vRes.rows.map(r => ({ date: r.data_date, lpcd: parseFloat(r.lpcd_value).toFixed(2) })),
        scheme: sRes.rows.map(r => ({ date: r.data_date, lpcd: parseFloat(r.lpcd_value).toFixed(2) }))
    };

    fs.writeFileSync("bidgaon_daily_stats.json", JSON.stringify(output, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
