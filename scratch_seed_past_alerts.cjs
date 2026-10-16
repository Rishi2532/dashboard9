require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seedLevel5() {
  const schemesRes = await pool.query("SELECT DISTINCT scheme_id FROM email_alert_logs WHERE sent_date = '2026-10-16' LIMIT 3");
  const level5Schemes = schemesRes.rows.map(r => r.scheme_id);
  console.log('Seeding 15+ days for:', level5Schemes);
  for (let i = 1; i <= 16; i++) {
    const dayNum = 16 - i;
    const dStr = dayNum >= 1 ? `2026-10-${String(dayNum).padStart(2, '0')}` : `2026-09-${String(30 + dayNum).padStart(2, '0')}`;
    await pool.query(`
      INSERT INTO email_alert_logs (
        scheme_id, scheme_name, region, village_name, esr_name, alert_type, alert_value,
        ee_civil_name, ee_civil_email, de_ae_civil_name, de_ae_civil_email, se_name, se_email,
        chief_engineer_name, chief_engineer_email, sent_date, sent_time, dispatch_type, created_at
      )
      SELECT 
        scheme_id, scheme_name, region, village_name, esr_name, alert_type, alert_value,
        ee_civil_name, ee_civil_email, de_ae_civil_name, de_ae_civil_email, se_name, se_email,
        chief_engineer_name, chief_engineer_email,
        $1::date, sent_time, dispatch_type,
        ($1 || ' 09:00:00+05:30')::timestamptz
      FROM email_alert_logs
      WHERE sent_date = '2026-10-16' AND scheme_id = ANY($2::text[])
    `, [dStr, level5Schemes]);
  }
  console.log('Level 5 seeded.');
  await pool.end();
}
seedLevel5().catch(e => { console.error(e); process.exit(1); });
