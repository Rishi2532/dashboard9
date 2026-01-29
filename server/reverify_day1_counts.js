import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function verifyCounts() {
  const client = await pool.connect();
  try {
    console.log("Re-verifying Day 1 Counts...");

    // 1. Get Latest Date (Day 1)
    // Note: Assuming Day 1 is the same max date for both, but better to check individual maxes if tables differ.
    // Usually dashboard uses one latest date or separate. The routes fetch MAX(data_date) per table.

    // --- DATE EXPLORATION WITH NEW LOGIC ---
    const datesRes = await client.query(`
      SELECT DISTINCT data_date,
        CASE 
          WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(data_date, 'DD-Mon-YY')
          WHEN data_date ~ '^[0-9]+-[A-Za-z]+$' THEN 
            CASE
              WHEN TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY') > (COALESCE(uploaded_at, CURRENT_DATE) + interval '1 month')
              THEN TO_DATE(data_date || '-' || (TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY')::int - 1), 'DD-Mon-YYYY')
              ELSE TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY')
            END
          ELSE NULL 
        END as parsed_date
      FROM scheme_lpcd_data_history
      ORDER BY parsed_date DESC NULLS LAST
    `);
    
    let dateReport = "Distinct Dates (Parsed DESC - NEW LOGIC):\n";
    datesRes.rows.forEach(r => {
      dateReport += `Raw: ${r.data_date} -> Parsed: ${r.parsed_date}\n`;
    });
    fs.writeFileSync(path.join(__dirname, 'date_exploration_new.txt'), dateReport);

    // Use the top parsed date
    const schemeDate = datesRes.rows[0]?.data_date;
    const villageDateRes = await client.query(`
      SELECT DISTINCT data_date,
        CASE 
          WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(data_date, 'DD-Mon-YY')
          WHEN data_date ~ '^[0-9]+-[A-Za-z]+$' THEN 
            CASE
              WHEN TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY') > (COALESCE(uploaded_at, CURRENT_DATE) + interval '1 month')
              THEN TO_DATE(data_date || '-' || (TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY')::int - 1), 'DD-Mon-YYYY')
              ELSE TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY')
            END
          ELSE NULL 
        END as parsed_date
      FROM water_scheme_data_history
      ORDER BY parsed_date DESC NULLS LAST
    `);
    const villageDate = villageDateRes.rows[0]?.data_date;
    
    fs.writeFileSync(path.join(__dirname, 'latest_date_new.txt'), `Scheme: ${schemeDate}, Village: ${villageDate}`);

    const schemeQueryStrict = `
      SELECT DISTINCT ON (scheme_id, COALESCE(block, ''), data_date)
        scheme_id,
        COALESCE(block, '') as block,
        lpcd_value::numeric as lpcd_value
      FROM scheme_lpcd_data_history
      WHERE data_date = $1
        AND lpcd_value IS NOT NULL 
        AND lpcd_value::numeric > 55
      ORDER BY scheme_id, COALESCE(block, ''), data_date, uploaded_at DESC NULLS LAST
    `;
    const schemesRes04Jan = await client.query(schemeQueryStrict, ['04-Jan']);
    const schemesRes05Jan = await client.query(schemeQueryStrict, ['05-Jan']);
    fs.writeFileSync(path.join(__dirname, 'scheme_Jan_counts.txt'), `04-Jan: ${schemesRes04Jan.rowCount}, 05-Jan: ${schemesRes05Jan.rowCount}`);

    const villageQueryStrict = `
      SELECT DISTINCT ON (scheme_id, village_name, data_date)
        scheme_id,
        village_name,
        lpcd_value::numeric as lpcd_value
      FROM water_scheme_data_history
      WHERE data_date = $1
        AND lpcd_value IS NOT NULL 
        AND lpcd_value::numeric > 55
      ORDER BY scheme_id, village_name, data_date, uploaded_at DESC NULLS LAST
    `; 
    const villagesResStrict = await client.query(villageQueryStrict, [villageDate]);
    fs.writeFileSync(path.join(__dirname, 'count_villages_strict_new.txt'), String(villagesResStrict.rowCount));

  } catch (err) {
    console.error("Error:", err);
  } finally {
    client.release();
    pool.end();
  }
}

verifyCounts();
