
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function verifyCounts() {
  console.log("Verifying LPCD Counts (Refined)...");

  try {
    // 1. Get latest date (using correct parse format)
    // Note: Dashboard uses 'DD-Mon-YY' for '...-YYYY', which might be risky but standard Postgres TO_DATE might handle 4 digits in YY? 
    // We will use 'DD-Mon-YYYY' which is correct.
    const latestDateRes = await pool.query(`
      SELECT MAX(TO_DATE(data_date, 'DD-Mon-YYYY')) as max_date 
      FROM water_scheme_data_history
      WHERE data_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$'
    `);
    const latestDate = latestDateRes.rows[0].max_date.toISOString().split('T')[0];
    console.log("Latest Date (Village):", latestDate);

    // 2. Village Counts (Deduplicated)
    const villageQuery = `
      WITH deduplicated AS (
        SELECT DISTINCT ON (scheme_id, village_name, data_date)
          scheme_id, village_name, lpcd_value, data_date
        FROM water_scheme_data_history
        WHERE TO_DATE(data_date, 'DD-Mon-YYYY') = $1::date
          AND lpcd_value IS NOT NULL
        ORDER BY scheme_id, village_name, data_date, uploaded_at DESC NULLS LAST
      )
      SELECT 
        COUNT(CASE WHEN NULLIF(lpcd_value, 'NaN')::numeric > 55 THEN 1 END) as gt_55,
        COUNT(CASE WHEN NULLIF(lpcd_value, 'NaN')::numeric >= 55 THEN 1 END) as gte_55,
        COUNT(*) as total
      FROM deduplicated
    `;
    const vRes = await pool.query(villageQuery, [latestDate]);
    console.log("Village Counts (Day 1 - Deduplicated):");
    console.log("  > 55:", vRes.rows[0].gt_55);
    console.log("  >= 55:", vRes.rows[0].gte_55);
    console.log("  Total:", vRes.rows[0].total);

    // 3. Scheme Counts (Deduplicated)
    // Dashboard query for scheme uses 'block' in DISTINCT ON, we'll mimic that or scheme_id
    const latestSchemeDateRes = await pool.query(`
      SELECT MAX(TO_DATE(data_date, 'DD-Mon-YYYY')) as max_date 
      FROM scheme_lpcd_data_history
      WHERE data_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$'
    `);
    const latestSchemeDate = latestSchemeDateRes.rows[0].max_date.toISOString().split('T')[0];
    console.log("Latest Date (Scheme):", latestSchemeDate);

    const schemeQuery = `
      WITH deduplicated AS (
        SELECT DISTINCT ON (scheme_id, COALESCE(block, ''), data_date)
          scheme_id, lpcd_value, data_date
        FROM scheme_lpcd_data_history
        WHERE TO_DATE(data_date, 'DD-Mon-YYYY') = $1::date
          AND lpcd_value IS NOT NULL
        ORDER BY scheme_id, COALESCE(block, ''), data_date, uploaded_at DESC NULLS LAST
      )
      SELECT 
        COUNT(CASE WHEN NULLIF(lpcd_value, 'NaN')::numeric > 55 THEN 1 END) as gt_55,
        COUNT(CASE WHEN NULLIF(lpcd_value, 'NaN')::numeric >= 55 THEN 1 END) as gte_55,
        COUNT(*) as total
      FROM deduplicated
    `;
    const sRes = await pool.query(schemeQuery, [latestSchemeDate]);
    console.log("Scheme Counts (Day 1 - Deduplicated):");
    console.log("  > 55:", sRes.rows[0].gt_55);
    console.log("  >= 55:", sRes.rows[0].gte_55);
    console.log("  Total:", sRes.rows[0].total);

  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

verifyCounts();
