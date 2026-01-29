
const pg = require('pg');
require('dotenv').config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function inspectUrls() {
  const client = await pool.connect();
  try {
    console.log("Inspecting scheme_lpcd_data_history for dashboard_url values...");
    
    // Get latest date to be relevant
    const latestDateRes = await client.query(`
      SELECT MAX(uploaded_at) as max_upload, MAX(data_date) as max_date 
      FROM scheme_lpcd_data_history
    `);
    console.log("Latest metadata:", latestDateRes.rows[0]);

    // Query 20 recent records
    const res = await client.query(`
      SELECT scheme_id, scheme_name, dashboard_url, data_date, uploaded_at
      FROM scheme_lpcd_data_history
      ORDER BY uploaded_at DESC
      LIMIT 20
    `);

    console.log("\nRecent 20 Records in History Table:");
    console.log("--------------------------------------------------------------------------------");
    console.log(String("Scheme ID").padEnd(15) + String("Scheme Name").padEnd(40) + "Dashboard URL");
    console.log("--------------------------------------------------------------------------------");
    
    const output = res.rows.map(r => {
      const url = r.dashboard_url === null ? "NULL" : 
                  r.dashboard_url === "" ? "EMPTY STRING" : 
                  `'${r.dashboard_url}'`;
      return String(r.scheme_id).padEnd(15) + 
             String(r.scheme_name.substring(0, 38)).padEnd(40) + 
             url;
    }).join('\n');
    
    const fs = require('fs');
    fs.writeFileSync('inspection_result.txt', output, 'utf8');
    console.log("Output written to inspection_result.txt");

  } catch (err) {
    console.error("Error executing query:", err);
  } finally {
    client.release();
    pool.end();
  }
}

inspectUrls();
