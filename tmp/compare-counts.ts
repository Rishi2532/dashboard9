import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDB();
  
  // Count distinct scheme_id in scheme_status
  const resStatus = await db.execute(sql.raw('SELECT COUNT(DISTINCT scheme_id) as count FROM scheme_status'));
  const countStatus = resStatus.rows[0].count;
  
  // Count distinct scheme_id in water_scheme_data
  const resWater = await db.execute(sql.raw('SELECT COUNT(DISTINCT scheme_id) as count FROM water_scheme_data'));
  const countWater = resWater.rows[0].count;
  
  console.log(`Unique schemes in scheme_status: ${countStatus}`);
  console.log(`Unique schemes in water_scheme_data: ${countWater}`);
  
  // Find schemes that are in one but not the other
  const onlyInStatus = await db.execute(sql.raw(`
    SELECT DISTINCT scheme_id, scheme_name FROM scheme_status 
    WHERE scheme_id NOT IN (SELECT DISTINCT scheme_id FROM water_scheme_data)
  `));
  
  const onlyInWater = await db.execute(sql.raw(`
    SELECT DISTINCT scheme_id, scheme_name FROM water_scheme_data 
    WHERE scheme_id NOT IN (SELECT DISTINCT scheme_id FROM scheme_status)
  `));
  
  console.log('\nSchemes only in scheme_status:');
  console.log(JSON.stringify(onlyInStatus.rows, null, 2));
  
  console.log('\nSchemes only in water_scheme_data:');
  console.log(JSON.stringify(onlyInWater.rows, null, 2));

  // Check for schemes with NULL scheme_id
  const nullIdStatus = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM scheme_status WHERE scheme_id IS NULL OR scheme_id = ''`));
  console.log(`\nRecords with NULL/empty scheme_id in scheme_status: ${nullIdStatus.rows[0].count}`);
}

main().catch(console.error);
