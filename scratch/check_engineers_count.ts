import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function check() {
  const db = await getDB();
  const res: any = await db.execute(sql`
    SELECT COUNT(DISTINCT LOWER(TRIM(name)))::int as total
    FROM (
      SELECT chief_engineer_name as name FROM scheme_engineer_details
      UNION ALL SELECT se_name FROM scheme_engineer_details
      UNION ALL SELECT ee_civil_name FROM scheme_engineer_details
      UNION ALL SELECT ee_mech_name FROM scheme_engineer_details
      UNION ALL SELECT de_ae_civil_name FROM scheme_engineer_details
      UNION ALL SELECT de_ae_mech_name FROM scheme_engineer_details
    ) raw_names
    WHERE name IS NOT NULL
      AND TRIM(name) NOT IN ('', '-', '--', '---', 'N/A', 'NA', 'None', 'null', 'undefined')
      AND LOWER(TRIM(name)) NOT LIKE '%vendor%'
      AND LOWER(TRIM(name)) NOT LIKE '%no engineer%'
  `);
  console.log('Total unique engineers from scheme_engineer_details:', res.rows[0]);

  const namesRes: any = await db.execute(sql`
    SELECT DISTINCT LOWER(TRIM(name)) as engineer_name
    FROM (
      SELECT chief_engineer_name as name FROM scheme_engineer_details
      UNION ALL SELECT se_name FROM scheme_engineer_details
      UNION ALL SELECT ee_civil_name FROM scheme_engineer_details
      UNION ALL SELECT ee_mech_name FROM scheme_engineer_details
      UNION ALL SELECT de_ae_civil_name FROM scheme_engineer_details
      UNION ALL SELECT de_ae_mech_name FROM scheme_engineer_details
    ) raw_names
    WHERE name IS NOT NULL
      AND TRIM(name) NOT IN ('', '-', '--', '---', 'N/A', 'NA', 'None', 'null', 'undefined')
      AND LOWER(TRIM(name)) NOT LIKE '%vendor%'
      AND LOWER(TRIM(name)) NOT LIKE '%no engineer%'
    ORDER BY engineer_name
  `);
  console.log('List of engineer names (' + namesRes.rows.length + '):', namesRes.rows.map((r: any) => r.engineer_name));
  process.exit(0);
}

check().catch(console.error);
