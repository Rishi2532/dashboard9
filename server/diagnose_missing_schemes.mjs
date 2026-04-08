
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

async function check() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const iotStatuses = ['Completed', 'Fully Completed', 'fully-completed', 'functionally completed'];
    
    // 1. Get all Fully Instrumented schemes from scheme_status
    const statusRes = await pool.query(`
      SELECT scheme_id, region, scheme_name 
      FROM scheme_status 
      WHERE LOWER(fully_completion_scheme_status) IN ($1, $2, $3, $4)
    `, iotStatuses.map(s => s.toLowerCase()));
    
    const statusSchemes = statusRes.rows;
    console.log(`Found ${statusSchemes.length} IoT schemes in scheme_status table.`);

    // 2. Get schemes present in water_scheme_data
    const dataRes = await pool.query(`
      SELECT DISTINCT scheme_id FROM water_scheme_data
    `);
    const dataIds = new Set(dataRes.rows.map(r => r.scheme_id));
    console.log(`Found ${dataIds.size} unique schemes in water_scheme_data table.`);

    // 3. Find disparity
    const missingInData = statusSchemes.filter(s => !dataIds.has(s.scheme_id));
    
    console.log(`\n--- SCHEMES IN scheme_status BUT MISSING FROM water_scheme_data (${missingInData.length}) ---`);
    missingInData.forEach(s => {
      console.log(`ID: ${s.scheme_id} | Region: ${s.region} | Name: ${s.scheme_name}`);
    });

  } catch (err) {
    console.error('Error during diagnostic:', err);
  } finally {
    await pool.end();
  }
}

check();
