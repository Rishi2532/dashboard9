import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function testAlerts() {
  const db = await getDB();
  const alerts: any = await db.execute(sql`
    SELECT * FROM email_alert_logs ORDER BY id DESC LIMIT 50
  `);
  console.log('Total alerts fetched:', alerts.rows.length);
  if (alerts.rows.length > 0) {
    const sample = alerts.rows[0];
    console.log('Sample alert keys:', Object.keys(sample).filter(k => k.includes('name') || k.includes('email') || k.includes('engineer') || k.includes('vendor')));
    console.log('Sample alert values:', {
      ee_civil_name: sample.ee_civil_name,
      ee_mech_name: sample.ee_mech_name,
      de_ae_civil_name: sample.de_ae_civil_name,
      de_ae_mech_name: sample.de_ae_mech_name,
      se_name: sample.se_name,
      chief_engineer_name: sample.chief_engineer_name,
      vendor_name: sample.vendor_name,
      civil_engineer_name: sample.civil_engineer_name,
      mechanical_engineer_name: sample.mechanical_engineer_name
    });
  }
  process.exit(0);
}

testAlerts().catch(console.error);
