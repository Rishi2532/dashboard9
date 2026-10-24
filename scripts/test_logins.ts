import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    const db = await getDB();
    const sedRes = await db.execute(sql`
      SELECT 
        chief_engineer_name, chief_engineer_mobile, chief_engineer_email,
        se_name, se_mobile, se_email,
        ee_civil_name, ee_civil_mobile, ee_civil_email,
        ee_mech_name, ee_mech_mobile, ee_mech_email,
        de_ae_civil_name, de_ae_civil_mobile, de_ae_civil_email,
        de_ae_mech_name, de_ae_mech_mobile, de_ae_mech_email
      FROM scheme_engineer_details
      LIMIT 10
    `);
    console.log("Sample scheme_engineer_details:", sedRes.rows[0]);

    // Check distinct engineer names in scheme_engineer_details
    const ceNames = await db.execute(sql`SELECT DISTINCT chief_engineer_name FROM scheme_engineer_details WHERE chief_engineer_name IS NOT NULL AND chief_engineer_name != ''`);
    const seNames = await db.execute(sql`SELECT DISTINCT se_name FROM scheme_engineer_details WHERE se_name IS NOT NULL AND se_name != ''`);
    const eeCivNames = await db.execute(sql`SELECT DISTINCT ee_civil_name FROM scheme_engineer_details WHERE ee_civil_name IS NOT NULL AND ee_civil_name != ''`);
    const eeMechNames = await db.execute(sql`SELECT DISTINCT ee_mech_name FROM scheme_engineer_details WHERE ee_mech_name IS NOT NULL AND ee_mech_name != ''`);

    console.log("CE count:", ceNames.rows.length);
    console.log("SE count:", seNames.rows.length);
    console.log("EE Civil count:", eeCivNames.rows.length);
    console.log("EE Mech count:", eeMechNames.rows.length);

    // Check if any user in users table matches any engineer in scheme_engineer_details
    const users = await db.execute(sql`SELECT id, username, name, email, phone, role FROM users WHERE role != 'admin'`);
    console.log(`Checking ${users.rows.length} users against scheme_engineer_details...`);

    for (const u of users.rows) {
      const match = await db.execute(sql`
        SELECT scheme, chief_engineer_name, se_name, ee_civil_name, ee_mech_name, de_ae_civil_name, de_ae_mech_name
        FROM scheme_engineer_details
        WHERE 
          LOWER(chief_engineer_name) = LOWER(${u.name || ''}) OR
          LOWER(chief_engineer_email) = LOWER(${u.email || ''}) OR
          LOWER(se_name) = LOWER(${u.name || ''}) OR
          LOWER(se_email) = LOWER(${u.email || ''}) OR
          LOWER(ee_civil_name) = LOWER(${u.name || ''}) OR
          LOWER(ee_civil_email) = LOWER(${u.email || ''}) OR
          LOWER(ee_mech_name) = LOWER(${u.name || ''}) OR
          LOWER(ee_mech_email) = LOWER(${u.email || ''}) OR
          LOWER(de_ae_civil_name) = LOWER(${u.name || ''}) OR
          LOWER(de_ae_civil_email) = LOWER(${u.email || ''}) OR
          LOWER(de_ae_mech_name) = LOWER(${u.name || ''}) OR
          LOWER(de_ae_mech_email) = LOWER(${u.email || ''})
        LIMIT 1
      `);
      if (match.rows.length > 0) {
        console.log(`MATCHED USER: id=${u.id}, user=${u.username}, name="${u.name}", email="${u.email}"`);
      }
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}

run();
