import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const result = await pool.query(
    "SELECT * FROM email_alert_logs WHERE ticket_id IN ('TKT-09948GZO', 'TKT-0994BUCS', 'TKT-09946RDM') LIMIT 10"
  );
  console.log("From email_alert_logs:");
  console.table(result.rows);

  const result2 = await pool.query(
    "SELECT scheme_id, village_name, water_value_day7, lpcd_value_day7 FROM water_scheme_data WHERE scheme_id IN ('20092478', '20027978', '20018579') LIMIT 10"
  );
  console.log("From water_scheme_data:");
  console.table(result2.rows);

  process.exit(0);
}

main();
