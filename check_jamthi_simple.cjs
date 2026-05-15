
const { Pool } = require('pg');
require('dotenv').config();

async function dumpJamthiHistory() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query(`
      SELECT 
        data_date, lpcd_value, uploaded_at
      FROM water_scheme_data_history 
      WHERE village_name LIKE '%Jamthi Bk%'
      ORDER BY uploaded_at DESC
      LIMIT 50
    `);
    
    console.log(`History records for Jamthi Bk.:`);
    res.rows.forEach(row => {
      console.log(`- Date: ${row.data_date}, LPCD: ${row.lpcd_value}, Uploaded: ${row.uploaded_at}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

dumpJamthiHistory();
