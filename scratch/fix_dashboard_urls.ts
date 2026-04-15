
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
  const pool = new pg.Pool({
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
    
    // U+FFFD is the replacement character
    // U+00A0 is the non-breaking space
    const brokenChar = '\uFFFD';
    const correctChar = '\u00A0';
    
    console.log(`Starting migration to fix broken non-breaking spaces in dashboard_url...`);
    
    for (const table of tables) {
      console.log(`Processing table: ${table}...`);
      
      // Check if table has dashboard_url column
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
      `, [brokenChar, correctChar, `%${brokenChar}%`]);
      
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
