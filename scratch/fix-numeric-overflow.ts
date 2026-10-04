import dotenv from "dotenv";
dotenv.config();
import { setupDatabase } from "../server/setup-db";

async function run() {
  const { pool } = setupDatabase();
  const client = await pool.connect();
  try {
    console.log("Checking columns of realtime_sensor_data...");
    const res = await client.query(`
      SELECT column_name, data_type, numeric_precision, numeric_scale
      FROM information_schema.columns
      WHERE table_name = 'realtime_sensor_data'
      ORDER BY ordinal_position;
    `);
    console.table(res.rows);

    console.log("\nAltering columns to NUMERIC without precision/scale so it accepts ANY size number...");
    await client.query(`
      ALTER TABLE realtime_sensor_data ALTER COLUMN flow_rate_value TYPE NUMERIC;
      ALTER TABLE realtime_sensor_data ALTER COLUMN pressure_value TYPE NUMERIC;
      ALTER TABLE realtime_sensor_data ALTER COLUMN chlorine_value TYPE NUMERIC;
      ALTER TABLE realtime_sensor_data ALTER COLUMN prev_chlorine_value TYPE NUMERIC;
    `);
    console.log("✅ Columns successfully altered to NUMERIC!");

    const res2 = await client.query(`
      SELECT column_name, data_type, numeric_precision, numeric_scale
      FROM information_schema.columns
      WHERE table_name = 'realtime_sensor_data'
      ORDER BY ordinal_position;
    `);
    console.table(res2.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
