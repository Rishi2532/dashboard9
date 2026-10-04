import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    console.log("Migrating realtime tables...");
    await client.query(`
      ALTER TABLE realtime_sensor_data ADD COLUMN IF NOT EXISTS prev_chlorine_status VARCHAR(20);
      ALTER TABLE realtime_sensor_data ADD COLUMN IF NOT EXISTS prev_chlorine_value DECIMAL;

      CREATE TABLE IF NOT EXISTS realtime_acknowledgements (
        id SERIAL PRIMARY KEY,
        token VARCHAR(128) NOT NULL UNIQUE,
        scheme_id VARCHAR(100),
        scheme_name VARCHAR(255),
        village_name VARCHAR(255),
        esr_name VARCHAR(255),
        alert_type VARCHAR(100) NOT NULL,
        alert_value VARCHAR(100),
        ticket_id VARCHAR(100),
        engineer_name VARCHAR(255),
        engineer_email VARCHAR(255),
        engineer_mobile VARCHAR(30),
        remarks TEXT,
        is_acknowledged BOOLEAN DEFAULT FALSE,
        acknowledged_at TIMESTAMP WITH TIME ZONE,
        sent_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_realtime_ack_token ON realtime_acknowledgements(token);
      CREATE INDEX IF NOT EXISTS idx_realtime_ack_scheme ON realtime_acknowledgements(scheme_id, alert_type, sent_date);
      CREATE INDEX IF NOT EXISTS idx_realtime_ack_email ON realtime_acknowledgements(engineer_email);
    `);
    console.log("✅ realtime_acknowledgements table and columns created successfully!");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
