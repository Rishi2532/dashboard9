import 'dotenv/config';
import { getDB } from './db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDB();
  const res = await db.execute(sql`
    SELECT scheme_id, village_name, esr_name, count(1)::int as c
    FROM communication_status
    WHERE TRIM(pressure_connected) = 'Connected' AND pressure_status = 'Offline'
    GROUP BY scheme_id, village_name, esr_name
    HAVING count(1) > 1
  `);
  console.log('Duplicates in communication_status for pressure offline:', res.rows);

  const res2 = await db.execute(sql`
    SELECT count(distinct (scheme_id || '__' || village_name || '__' || esr_name))::int as unique_esrs
    FROM communication_status
    WHERE TRIM(pressure_connected) = 'Connected' AND pressure_status = 'Offline'
      AND scheme_id IN (SELECT DISTINCT scheme_id FROM email_alert_logs WHERE sent_date = '2026-10-19')
  `);
  console.log('Unique ESRs with pressure offline in today alerted schemes:', res2.rows);

  // Check which 2 schemes or ESRs make 94 vs 92:
  const diff = await db.execute(sql`
    SELECT scheme_id, village_name, esr_name
    FROM communication_status c
    WHERE TRIM(c.pressure_connected) = 'Connected' AND c.pressure_status = 'Offline'
      AND c.scheme_id IN (SELECT DISTINCT scheme_id FROM email_alert_logs WHERE sent_date = '2026-10-19')
      AND c.scheme_id NOT IN (
        SELECT DISTINCT scheme_id FROM scheme_status WHERE category = 'Functional' OR scheme_category = 'Functional'
      )
  `);
  console.log('Non-functional scheme pressure offline in communication_status:', diff.rows);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
