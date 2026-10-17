import dotenv from 'dotenv';
dotenv.config();
import { setupDatabase } from './server/setup-db.js';

async function check() {
  const { pool } = setupDatabase();
  try {
    const testRes = await pool.query(`
      SELECT 
        ced.id,
        ced.dispatch_date::date as dt,
        ced.engineer_name,
        ced.engineer_role,
        COALESCE(sid.scheme_id, ced.scheme_ids->>0, 'MJP-SCHEME') as scheme_id
      FROM consolidated_email_dispatches ced
      LEFT JOIN LATERAL jsonb_array_elements_text(COALESCE(ced.scheme_ids, '[]'::jsonb)) AS sid(scheme_id) ON true
      WHERE ced.engineer_role ILIKE '%Executive%'
    `);
    console.log('Unnested EE schemes count:', testRes.rows.length);
    console.log(testRes.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
    process.exit(0);
  }
}
check();
