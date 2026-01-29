
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT data_date, COUNT(*) as count
      FROM water_scheme_data_history 
      GROUP BY data_date 
      LIMIT 5;
    `);
    console.log("WATER_SCHEME_DATES:" + JSON.stringify(res.rows));

    const res2 = await pool.query(`
      SELECT data_date, COUNT(*) as count
      FROM scheme_lpcd_data_history 
      GROUP BY data_date 
      LIMIT 5;
    `);
    console.log("SCHEME_LPCD_DATES:" + JSON.stringify(res2.rows));

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
