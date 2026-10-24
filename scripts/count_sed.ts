import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function run() {
  const db = await getDB();
  const res = await db.execute(sql`
    SELECT COUNT(*) as cnt
    FROM scheme_engineer_details
    WHERE 
      chief_engineer_email = 'salunkerishikesh@gmail.com' OR
      se_email = 'salunkerishikesh@gmail.com' OR
      ee_civil_email = 'salunkerishikesh@gmail.com' OR
      ee_mech_email = 'salunkerishikesh@gmail.com' OR
      de_ae_civil_email = 'salunkerishikesh@gmail.com' OR
      de_ae_mech_email = 'salunkerishikesh@gmail.com'
  `);
  console.log("Rows with salunkerishikesh@gmail.com:", res.rows[0]);
  process.exit(0);
}
run();
