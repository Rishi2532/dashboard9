import { Pool } from "pg";
import { config } from "dotenv";
config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function addCol() {
  try {
    await pool.query("ALTER TABLE email_alert_logs ADD COLUMN ticket_id VARCHAR(100);");
    console.log("Column ticket_id added successfully!");
  } catch (err: any) {
    if (err.code === "42701") {
      console.log("Column ticket_id already exists.");
    } else {
      console.error("Error:", err);
    }
  } finally {
    pool.end();
  }
}

addCol();
