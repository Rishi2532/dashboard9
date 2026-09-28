import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    const colRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'scheme_engineer_details'
      ORDER BY ordinal_position
    `);
    console.log("Columns of scheme_engineer_details:", colRes.rows.map(r => r.column_name));

    const res = await client.query(`
      SELECT chief_engineer_name, se_name, ee_civil_name, ee_mech_name, 
             de_ae_civil_name, de_ae_mech_name
      FROM scheme_engineer_details 
      LIMIT 10
    `);
    console.log("Sample scheme_engineer_details rows:", res.rows);

    const q = `
      SELECT COUNT(DISTINCT LOWER(TRIM(name)))::int as total
      FROM (
        SELECT chief_engineer_name as name FROM scheme_engineer_details WHERE chief_engineer_name IS NOT NULL AND TRIM(chief_engineer_name) NOT IN ('', '-', '--', '---', 'N/A', 'NA', 'None', 'null') AND LOWER(TRIM(chief_engineer_name)) NOT LIKE '%vendor%'
        UNION
        SELECT se_name as name FROM scheme_engineer_details WHERE se_name IS NOT NULL AND TRIM(se_name) NOT IN ('', '-', '--', '---', 'N/A', 'NA', 'None', 'null') AND LOWER(TRIM(se_name)) NOT LIKE '%vendor%'
        UNION
        SELECT ee_civil_name as name FROM scheme_engineer_details WHERE ee_civil_name IS NOT NULL AND TRIM(ee_civil_name) NOT IN ('', '-', '--', '---', 'N/A', 'NA', 'None', 'null') AND LOWER(TRIM(ee_civil_name)) NOT LIKE '%vendor%'
        UNION
        SELECT ee_mech_name as name FROM scheme_engineer_details WHERE ee_mech_name IS NOT NULL AND TRIM(ee_mech_name) NOT IN ('', '-', '--', '---', 'N/A', 'NA', 'None', 'null') AND LOWER(TRIM(ee_mech_name)) NOT LIKE '%vendor%'
        UNION
        SELECT de_ae_civil_name as name FROM scheme_engineer_details WHERE de_ae_civil_name IS NOT NULL AND TRIM(de_ae_civil_name) NOT IN ('', '-', '--', '---', 'N/A', 'NA', 'None', 'null') AND LOWER(TRIM(de_ae_civil_name)) NOT LIKE '%vendor%'
        UNION
        SELECT de_ae_mech_name as name FROM scheme_engineer_details WHERE de_ae_mech_name IS NOT NULL AND TRIM(de_ae_mech_name) NOT IN ('', '-', '--', '---', 'N/A', 'NA', 'None', 'null') AND LOWER(TRIM(de_ae_mech_name)) NOT LIKE '%vendor%'
      ) sub
    `;
    const countRes = await client.query(q);
    console.log("Clean count of distinct engineers in scheme_engineer_details:", countRes.rows[0].total);

    const listRes = await client.query(`
      SELECT DISTINCT LOWER(TRIM(name)) as name
      FROM (
        SELECT chief_engineer_name as name FROM scheme_engineer_details WHERE chief_engineer_name IS NOT NULL AND TRIM(chief_engineer_name) NOT IN ('', '-', '--', '---', 'N/A', 'NA', 'None', 'null') AND LOWER(TRIM(chief_engineer_name)) NOT LIKE '%vendor%'
        UNION
        SELECT se_name as name FROM scheme_engineer_details WHERE se_name IS NOT NULL AND TRIM(se_name) NOT IN ('', '-', '--', '---', 'N/A', 'NA', 'None', 'null') AND LOWER(TRIM(se_name)) NOT LIKE '%vendor%'
        UNION
        SELECT ee_civil_name as name FROM scheme_engineer_details WHERE ee_civil_name IS NOT NULL AND TRIM(ee_civil_name) NOT IN ('', '-', '--', '---', 'N/A', 'NA', 'None', 'null') AND LOWER(TRIM(ee_civil_name)) NOT LIKE '%vendor%'
        UNION
        SELECT ee_mech_name as name FROM scheme_engineer_details WHERE ee_mech_name IS NOT NULL AND TRIM(ee_mech_name) NOT IN ('', '-', '--', '---', 'N/A', 'NA', 'None', 'null') AND LOWER(TRIM(ee_mech_name)) NOT LIKE '%vendor%'
        UNION
        SELECT COALESCE(NULLIF(TRIM(de_ae_civil_name), ''), NULLIF(TRIM(civil_engineer_name), '')) as name FROM scheme_engineer_details WHERE COALESCE(NULLIF(TRIM(de_ae_civil_name), ''), NULLIF(TRIM(civil_engineer_name), '')) NOT IN ('', '-', '--', '---', 'N/A', 'NA', 'None', 'null') AND LOWER(COALESCE(NULLIF(TRIM(de_ae_civil_name), ''), NULLIF(TRIM(civil_engineer_name), ''))) NOT LIKE '%vendor%'
        UNION
        SELECT COALESCE(NULLIF(TRIM(de_ae_mech_name), ''), NULLIF(TRIM(mechanical_engineer_name), ''), NULLIF(TRIM(site_supervisor_name), '')) as name FROM scheme_engineer_details WHERE COALESCE(NULLIF(TRIM(de_ae_mech_name), ''), NULLIF(TRIM(mechanical_engineer_name), ''), NULLIF(TRIM(site_supervisor_name), '')) NOT IN ('', '-', '--', '---', 'N/A', 'NA', 'None', 'null') AND LOWER(COALESCE(NULLIF(TRIM(de_ae_mech_name), ''), NULLIF(TRIM(mechanical_engineer_name), ''), NULLIF(TRIM(site_supervisor_name), ''))) NOT LIKE '%vendor%'
      ) sub
      ORDER BY name ASC
    `);
    console.log("Distinct engineer names:", listRes.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
