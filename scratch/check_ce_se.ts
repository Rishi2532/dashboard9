import { getDB } from '../server/db.js';
import { sql } from 'drizzle-orm';

async function check() {
  const db = await getDB();
  const res = await db.execute(sql`
    SELECT id, engineer_name, engineer_role, scheme_ids, scheme_names, total_schemes, total_alerts
    FROM consolidated_email_dispatches
    WHERE engineer_role IN ('Chief Engineer (CE)', 'Superintending Engineer (SE)')
    ORDER BY id;
  `);
  console.log("CE & SE total count:", res.rows.length);
  const emptySchemes = res.rows.filter((r: any) => !r.scheme_names || r.scheme_names.length === 0 || !r.scheme_ids || r.scheme_ids.length === 0);
  console.log("Empty schemes count:", emptySchemes.length);
  if (emptySchemes.length > 0) {
    console.log("Sample empty:", emptySchemes.slice(0, 3));
  }
  console.log("First 3 records:", res.rows.slice(0, 3));
  process.exit(0);
}

check();
