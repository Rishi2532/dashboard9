import { getDB } from '../server/db.js';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDB();
  const levelRoles = {
    3: ["'Chief Engineer (CE)'", "'Superintending Engineer (SE)'"],
    4: ["'Member Secretary (MS)'", "'Head - MJP'"],
    5: ["'Principal Secretary (PS)'", "'Head - WSSD'"],
  };

  const res = await db.execute(sql`
    SELECT 
      d.id,
      d.dispatch_date,
      d.sent_time,
      d.engineer_name,
      d.engineer_email,
      d.engineer_role,
      d.engineer_mobile,
      d.scheme_ids,
      d.scheme_names,
      d.total_alerts,
      d.lpcd_alerts_count,
      d.chlorine_alerts_count,
      d.pressure_alerts_count,
      d.offline_alerts_count,
      d.subject,
      d.status,
      d.created_at,
      ss.region
    FROM consolidated_email_dispatches d
    LEFT JOIN scheme_status ss ON ss.scheme_id = (d.scheme_ids->>0)
    WHERE d.engineer_role IN ('Chief Engineer (CE)', 'Superintending Engineer (SE)')
    ORDER BY d.id;
  `);
  console.log('Total records:', (res.rows || res).length);
  const byRegion: Record<string, number> = {};
  (res.rows || res).forEach((r: any) => {
    const reg = r.region || 'Unknown';
    byRegion[reg] = (byRegion[reg] || 0) + 1;
  });
  console.log('By Region:', byRegion);
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
