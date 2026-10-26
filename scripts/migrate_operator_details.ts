import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function updateSchema() {
  const db = await getDB();
  await db.execute(sql`
    ALTER TABLE scheme_operator_details ADD COLUMN IF NOT EXISTS operated_by VARCHAR(100) DEFAULT 'MJP';
    ALTER TABLE scheme_operator_details ADD COLUMN IF NOT EXISTS chief_se_name VARCHAR(255);
    ALTER TABLE scheme_operator_details ADD COLUMN IF NOT EXISTS chief_se_number VARCHAR(50);
  `);
  console.log('Columns added successfully.');

  // Populate missing operated_by with 'MJP' if null
  await db.execute(sql`
    UPDATE scheme_operator_details 
    SET operated_by = 'MJP' 
    WHERE operated_by IS NULL OR operated_by = '';
  `);

  // Populate chief_se_name and chief_se_number from scheme_engineer_details where matching
  await db.execute(sql`
    UPDATE scheme_operator_details sod
    SET 
      chief_se_name = COALESCE(sod.chief_se_name, sed.se_name, sed.chief_engineer_name, '-'),
      chief_se_number = COALESCE(sod.chief_se_number, sed.se_mobile, sed.chief_engineer_mobile, '-')
    FROM scheme_engineer_details sed
    WHERE (sod.scheme_id IS NOT NULL AND sod.scheme_id != '' AND sod.scheme_id = sed.scheme_id)
       OR (sod.scheme_name IS NOT NULL AND sod.scheme_name != '' AND sod.scheme_name ILIKE sed.scheme);
  `);

  // For any remaining, set default '-'
  await db.execute(sql`
    UPDATE scheme_operator_details
    SET 
      chief_se_name = COALESCE(chief_se_name, '-'),
      chief_se_number = COALESCE(chief_se_number, '-')
    WHERE chief_se_name IS NULL OR chief_se_number IS NULL;
  `);

  const sample = await db.execute(sql`
    SELECT id, scheme_name, village_name, operated_by, operator_name, operator_number, ee_name, ee_email, ee_number, chief_se_name, chief_se_number 
    FROM scheme_operator_details 
    LIMIT 3;
  `);
  console.log('Updated rows:');
  console.table(sample.rows);

  process.exit(0);
}

updateSchema().catch(console.error);
