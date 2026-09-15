import { Pool } from "pg";
import { config } from "dotenv";
config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function addCol() {
  try {
    const queries = [
      "ALTER TABLE email_alert_logs ADD COLUMN IF NOT EXISTS ee_civil_name VARCHAR(255);",
      "ALTER TABLE email_alert_logs ADD COLUMN IF NOT EXISTS ee_civil_email VARCHAR(255);",
      "ALTER TABLE email_alert_logs ADD COLUMN IF NOT EXISTS ee_mech_name VARCHAR(255);",
      "ALTER TABLE email_alert_logs ADD COLUMN IF NOT EXISTS ee_mech_email VARCHAR(255);",
      "ALTER TABLE email_alert_logs ADD COLUMN IF NOT EXISTS de_ae_civil_name VARCHAR(255);",
      "ALTER TABLE email_alert_logs ADD COLUMN IF NOT EXISTS de_ae_civil_email VARCHAR(255);",
      "ALTER TABLE email_alert_logs ADD COLUMN IF NOT EXISTS de_ae_mech_name VARCHAR(255);",
      "ALTER TABLE email_alert_logs ADD COLUMN IF NOT EXISTS de_ae_mech_email VARCHAR(255);",
      "ALTER TABLE email_alert_logs ADD COLUMN IF NOT EXISTS se_name VARCHAR(255);",
      "ALTER TABLE email_alert_logs ADD COLUMN IF NOT EXISTS se_email VARCHAR(255);",
      "ALTER TABLE email_alert_logs ADD COLUMN IF NOT EXISTS chief_engineer_name VARCHAR(255);",
      "ALTER TABLE email_alert_logs ADD COLUMN IF NOT EXISTS chief_engineer_email VARCHAR(255);"
    ];
    for (const q of queries) {
      await pool.query(q);
    }
    console.log("All missing columns in email_alert_logs verified/added successfully!");
  } catch (err: any) {
    console.error("Error:", err);
  } finally {
    pool.end();
  }
}

addCol();
