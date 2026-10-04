import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkAndMigrate() {
  const client = await pool.connect();
  try {
    console.log("Checking realtime_sensor_data table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS realtime_sensor_data (
        id SERIAL PRIMARY KEY,
        scheme_id VARCHAR(100),
        village_name VARCHAR(255),
        esr_name VARCHAR(255),
        chlorine_value DECIMAL,
        chlorine_timestamp TIMESTAMP WITH TIME ZONE,
        chlorine_comm_status VARCHAR(20),
        pressure_value DECIMAL(12, 2),
        pressure_timestamp TIMESTAMP WITH TIME ZONE,
        pressure_comm_status VARCHAR(20),
        flow_rate_value DECIMAL(12, 2),
        flow_rate_timestamp TIMESTAMP WITH TIME ZONE,
        flow_rate_comm_status VARCHAR(20),
        last_updated_values TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_updated_comm TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT unique_realtime_esr UNIQUE (scheme_id, village_name, esr_name)
      );

      ALTER TABLE realtime_sensor_data ADD COLUMN IF NOT EXISTS flow_rate_value DECIMAL(12, 2);
      ALTER TABLE realtime_sensor_data ADD COLUMN IF NOT EXISTS flow_rate_timestamp TIMESTAMP WITH TIME ZONE;
      ALTER TABLE realtime_sensor_data ADD COLUMN IF NOT EXISTS flow_rate_comm_status VARCHAR(20);
      ALTER TABLE realtime_sensor_data ADD COLUMN IF NOT EXISTS last_updated_values TIMESTAMP WITH TIME ZONE DEFAULT NOW();
      ALTER TABLE realtime_sensor_data ADD COLUMN IF NOT EXISTS last_updated_comm TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    `);
    console.log("✅ realtime_sensor_data table verified and updated!");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

checkAndMigrate();
