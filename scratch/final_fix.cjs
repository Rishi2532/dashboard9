
const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    const tables = [
      'scheme_status',
      'water_scheme_data',
      'chlorine_data',
      'pressure_data',
      'scheme_lpcd_data_history',
      'chlorine_history',
      'pressure_history',
      'water_consumption'
    ];
    
    for (const table of tables) {
      console.log(`Processing ${table}...`);
      
      const res = await client.query(`SELECT * FROM ${table} WHERE dashboard_url LIKE '%EF%BF%BD%' OR dashboard_url LIKE '%\uFFFD%'`);
      console.log(`Found ${res.rows.length} rows to fix in ${table}.`);
      
      for (const row of res.rows) {
        let newUrl = row.dashboard_url;
        if (newUrl) {
          newUrl = newUrl.replace(/%EF%BF%BD/g, '%C2%A0');
          newUrl = newUrl.replace(/\uFFFD/g, '\u00A0');
          
          // Use primary keys to update
          let whereClause = '';
          let params = [newUrl];
          
          if (table === 'scheme_status') {
            whereClause = 'WHERE scheme_id = $2 AND block = $3';
            params.push(row.scheme_id, row.block);
          } else if (table === 'water_scheme_data') {
            whereClause = 'WHERE scheme_id = $2 AND village_name = $3 AND block = $4';
            params.push(row.scheme_id, row.village_name, row.block);
          } else {
            whereClause = 'WHERE scheme_id = $2 AND village_name = $3 AND esr_name = $4';
            params.push(row.scheme_id, row.village_name, row.esr_name);
          }
          
          await client.query(`UPDATE ${table} SET dashboard_url = $1 ${whereClause}`, params);
        }
      }
      console.log(`Done fixing ${table}.`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
