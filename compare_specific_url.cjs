
const pg = require('pg');
require('dotenv').config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function compareUrls() {
  const client = await pool.connect();
  try {
    const schemeId = '7945938';
    console.log(`Comparing URLs for Scheme ID: ${schemeId}`);

    const res = await client.query(`
      SELECT 
        ss.dashboard_url as status_url,
        sldh.dashboard_url as history_url
      FROM scheme_status ss
      JOIN scheme_lpcd_data_history sldh ON ss.scheme_id = sldh.scheme_id
      WHERE ss.scheme_id = $1
      ORDER BY sldh.uploaded_at DESC
      LIMIT 1
    `, [schemeId]);

    if (res.rows.length > 0) {
      console.log("Status Table URL:", res.rows[0].status_url);
      console.log("History Table URL:", res.rows[0].history_url);
      
      if (res.rows[0].status_url === res.rows[0].history_url) {
        console.log("Conclusion: URLs are IDENTICAL.");
      } else {
        console.log("Conclusion: URLs are DIFFERENT.");
      }
    } else {
      console.log("Scheme not found in both tables.");
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    client.release();
    pool.end();
  }
}

compareUrls();
