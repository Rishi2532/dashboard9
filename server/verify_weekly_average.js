import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function verify() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    const dates = ['29-Dec', '30-Dec', '31-Dec', '01-Jan', '02-Jan', '03-Jan', '04-Jan'];
    const region = 'Amravati';

    const query = `
      WITH village_averages AS (
        SELECT 
          region,
          scheme_id,
          village_name,
          block,
          AVG(NULLIF(lpcd_value, 'NaN')::numeric) as avg_lpcd
        FROM water_scheme_data_history
        WHERE data_date IN (${dates.map((_, i) => '$' + (i + 2)).join(', ')})
          AND region = $1
        GROUP BY region, scheme_id, village_name, block
      )
      SELECT 
        COUNT(CASE WHEN avg_lpcd > 55 THEN 1 END)::integer as above_55,
        COUNT(CASE WHEN avg_lpcd <= 55 AND avg_lpcd > 0 THEN 1 END)::integer as below_55,
        COUNT(CASE WHEN avg_lpcd = 0 OR avg_lpcd IS NULL THEN 1 END)::integer as no_water
      FROM village_averages;
    `;

    const res = await client.query(query, [region, ...dates]);
    console.log(`Results for ${region} (WITH Duplicates):`);
    console.log(JSON.stringify(res.rows[0], null, 2));

    const dedupQuery = `
      WITH deduplicated AS (
        SELECT DISTINCT ON (scheme_id, village_name, block, data_date)
          region, scheme_id, village_name, block, lpcd_value, data_date
        FROM water_scheme_data_history
        WHERE data_date IN (${dates.map((_, i) => '$' + (i + 2)).join(', ')})
          AND region = $1
        ORDER BY scheme_id, village_name, block, data_date, uploaded_at DESC
      ),
      village_averages AS (
        SELECT 
          region, scheme_id, village_name, block,
          AVG(NULLIF(lpcd_value, 'NaN')::numeric) as avg_lpcd
        FROM deduplicated
        GROUP BY region, scheme_id, village_name, block
      )
      SELECT 
        COUNT(CASE WHEN avg_lpcd > 55 THEN 1 END)::integer as above_55,
        COUNT(CASE WHEN avg_lpcd <= 55 AND avg_lpcd > 0 THEN 1 END)::integer as below_55,
        COUNT(CASE WHEN avg_lpcd = 0 OR avg_lpcd IS NULL THEN 1 END)::integer as no_water
      FROM village_averages;
    `;

    const resDedup = await client.query(dedupQuery, [region, ...dates]);
    console.log(`Results for ${region} (DEDUPLICATED):`);
    console.log(JSON.stringify(resDedup.rows[0], null, 2));

    // Also check total villages in the table for this region in history roughly
    const totalQuery = `SELECT COUNT(DISTINCT village_name) FROM water_scheme_data_history WHERE region = $1`;
    const totalRes = await client.query(totalQuery, [region]);
    console.log(`Total distinct village names in history for ${region}: ${totalRes.rows[0].count}`);

    // Check for duplicates
    const dupQuery = `
      SELECT scheme_id, village_name, block, data_date, COUNT(*) 
      FROM water_scheme_data_history 
      WHERE region = $1 AND data_date IN (${dates.map((_, i) => '$' + (i + 2)).join(', ')})
      GROUP BY scheme_id, village_name, block, data_date
      HAVING COUNT(*) > 1
      LIMIT 10
    `;
    const dupRes = await client.query(dupQuery, [region, ...dates]);
    if (dupRes.rows.length > 0) {
      console.log('Detected duplicates for these dates:');
      console.log(JSON.stringify(dupRes.rows, null, 2));
    } else {
      console.log('No duplicates detected for these dates.');
    }

  } finally {
    client.release();
    pool.end();
  }
}

verify();
