import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    const db = await getDB();
    const res = await db.execute(sql`
      SELECT scheme_id, scheme, chief_engineer_name, se_name, ee_civil_name, ee_mech_name, de_ae_civil_name, de_ae_mech_name
      FROM scheme_engineer_details
      WHERE 
        chief_engineer_name ILIKE '%deepak%' OR chief_engineer_name ILIKE '%ingale%' OR
        se_name ILIKE '%deepak%' OR se_name ILIKE '%ingale%' OR
        ee_civil_name ILIKE '%deepak%' OR ee_civil_name ILIKE '%ingale%' OR
        ee_mech_name ILIKE '%deepak%' OR ee_mech_name ILIKE '%ingale%' OR
        de_ae_civil_name ILIKE '%deepak%' OR de_ae_civil_name ILIKE '%ingale%' OR
        de_ae_mech_name ILIKE '%deepak%' OR de_ae_mech_name ILIKE '%ingale%'
    `);
    console.log("Deepak / Ingale in scheme_engineer_details:", res.rows);

    const rishiRes = await db.execute(sql`
      SELECT scheme_id, scheme, chief_engineer_name, se_name, ee_civil_name, ee_mech_name, de_ae_civil_name, de_ae_mech_name
      FROM scheme_engineer_details
      WHERE 
        chief_engineer_name ILIKE '%salunke%' OR chief_engineer_name ILIKE '%salunkhe%' OR
        se_name ILIKE '%salunke%' OR se_name ILIKE '%salunkhe%' OR
        ee_civil_name ILIKE '%salunke%' OR ee_civil_name ILIKE '%salunkhe%' OR
        ee_mech_name ILIKE '%salunke%' OR ee_mech_name ILIKE '%salunkhe%' OR
        de_ae_civil_name ILIKE '%salunke%' OR de_ae_civil_name ILIKE '%salunkhe%' OR
        de_ae_mech_name ILIKE '%salunke%' OR de_ae_mech_name ILIKE '%salunkhe%'
    `);
    console.log("Salunke / Salunkhe in scheme_engineer_details:", rishiRes.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}

run();
