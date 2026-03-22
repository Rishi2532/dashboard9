import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    const dates = ['09-Mar', '10-Mar', '11-Mar', '12-Mar', '13-Mar', '14-Mar', '15-Mar'];
    const dateParams = dates.map((_, i) => `$${i + 1}`).join(',');
    
    // Exact logic from chlorine-routes.ts around line 2563
    const query = `
          SELECT 
              village_name, population,
              lpcd_value, data_date
          FROM water_scheme_data_history
          WHERE region IS NOT NULL
          AND village_name ILIKE '%Dahigaon%'
          AND scheme_name ILIKE '%Takli & 4%'
          AND (
              data_date IN (${dateParams})
              OR
              TO_CHAR(TO_DATE(CASE 
                 WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN data_date
                 ELSE '01-Jan-2000'
              END, 'DD-Mon-YY'), 'DD-Mon') IN (${dateParams})
          )
    `;

    const result = await pool.query(query, dates);
    fs.writeFileSync('dahigaon_weekly_data.json', JSON.stringify(result.rows, null, 2));
    console.log("Wrote exact output to dahigaon_weekly_data.json");
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

check();
