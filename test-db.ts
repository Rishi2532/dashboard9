import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

async function run() {
  const { Pool } = pg;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    const res = await client.query("SELECT data_date FROM scheme_lpcd_data_history LIMIT 10;");
    console.log("scheme_lpcd_data_history:");
    console.table(res.rows);
    
    const res2 = await client.query("SELECT uploaded_at, water_date_day1 FROM water_scheme_data WHERE water_date_day1 IS NOT NULL LIMIT 10;");
    console.log("water_scheme_data:");
    console.table(res2.rows);
  } finally {
    client.release();
    pool.end();
  }
}

run().catch(console.error);
