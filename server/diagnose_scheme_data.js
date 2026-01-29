import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function diagnose() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    const results = {};

    const regionsRes = await client.query(`SELECT region, COUNT(*), MIN(data_date) as min_date, MAX(data_date) as max_date FROM scheme_lpcd_data_history GROUP BY region`);
    results.regionCoverage = regionsRes.rows;

    const latestDatesRes = await client.query(`
      SELECT region, data_date, COUNT(*) as count
      FROM (
        SELECT region, data_date, 
               ROW_NUMBER() OVER (PARTITION BY region ORDER BY 
                 CASE 
                   WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(data_date, 'DD-Mon-YY')
                   ELSE NULL 
                 END DESC
               ) as rn
        FROM scheme_lpcd_data_history
      ) t
      WHERE rn = 1
      GROUP BY region, data_date
    `);
    results.latestDatesPerRegion = latestDatesRes.rows;

    const latestDatesVillageRes = await client.query(`
      SELECT region, data_date, COUNT(*) as count
      FROM (
        SELECT region, data_date, 
               ROW_NUMBER() OVER (PARTITION BY region ORDER BY 
                 CASE 
                   WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(data_date, 'DD-Mon-YY')
                   ELSE NULL 
                 END DESC
               ) as rn
        FROM water_scheme_data_history
      ) t
      WHERE rn = 1
      GROUP BY region, data_date
    `);
    results.latestDatesPerRegionVillage = latestDatesVillageRes.rows;

    const datesRes = await client.query(`
      SELECT DISTINCT data_date, 
        CASE 
          WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(data_date, 'DD-Mon-YY')
          ELSE NULL 
        END as sort_date
      FROM scheme_lpcd_data_history 
      ORDER BY sort_date DESC
      LIMIT 10
    `);
    results.distinctDates = datesRes.rows.map(r => r.data_date);

    console.log(JSON.stringify(results, null, 2));

  } finally {
    client.release();
    pool.end();
  }
}

diagnose();
