
const { Pool } = require('pg');
require('dotenv').config();

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  const client = await pool.connect();
  
  try {
    const tables = [
      'scheme_status',
      'water_scheme_data',
      'chlorine_data',
      'pressure_data',
      'scheme_lpcd_data_history',
      'chlorine_history',
      'pressure_history'
    ];
    
    // The broken character is stored URL-encoded as %EF%BF%BD
    // We want to replace it with the encoded non-breaking space %C2%A0
    const brokenEncoded = '%EF%BF%BD';
    const correctEncoded = '%C2%A0';
    
    console.log(`Starting migration to fix encoded broken characters (%EF%BF%BD) in dashboard_url...`);
    
    for (const table of tables) {
      console.log(`Processing table: ${table}...`);
      
      const colCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = 'dashboard_url'
      `, [table]);
      
      if (colCheck.rows.length === 0) {
        console.log(`Skipping ${table} (no dashboard_url column).`);
        continue;
      }
      
      const result = await client.query(`
        UPDATE ${table} 
        SET dashboard_url = REPLACE(dashboard_url, $1, $2)
        WHERE dashboard_url LIKE $3
      `, [brokenEncoded, correctEncoded, `%${brokenEncoded}%`]);
      
      console.log(`Updated ${result.rowCount} rows in ${table}.`);
    }
    
    console.log('Migration completed successfully.');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
