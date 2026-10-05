const pg = require('pg');
require('dotenv').config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    console.log('=== Checking batches for Sep dates in water_scheme_data_history ===');
    const batches = await client.query(`
      SELECT upload_batch_id, uploaded_at, COUNT(*) as row_count,
             COUNT(CASE WHEN lpcd_value::numeric > 0 THEN 1 END) as positive_lpcd_count,
             COUNT(CASE WHEN lpcd_value::numeric = 0 THEN 1 END) as zero_lpcd_count,
             COUNT(CASE WHEN lpcd_value IS NULL THEN 1 END) as null_lpcd_count,
             MIN(data_date) as min_date, MAX(data_date) as max_date
      FROM water_scheme_data_history
      WHERE data_date IN ('16-Sep', '17-Sep', '18-Sep', '19-Sep', '20-Sep', '21-Sep', '22-Sep')
      GROUP BY upload_batch_id, uploaded_at
      ORDER BY uploaded_at DESC
    `);
    console.log('Batches for 16-Sep..22-Sep:', batches.rows);

    console.log('\n=== Checking what getVillageWeeklyStats query actually returns ===');
    const dates = ['16-Sep', '17-Sep', '18-Sep', '19-Sep', '20-Sep', '21-Sep', '22-Sep'];
    
    // Simulate deduplicated_history
    const dedupSample = await client.query(`
      WITH deduplicated_history AS (
        SELECT DISTINCT ON (scheme_id, village_name, block, data_date)
          scheme_id, village_name, block, lpcd_value, data_date, uploaded_at, upload_batch_id
        FROM water_scheme_data_history
        WHERE data_date = ANY($1)
        ORDER BY scheme_id, village_name, block, data_date, (lpcd_value IS NOT NULL AND TRIM(lpcd_value::text) != '') DESC, uploaded_at DESC
      )
      SELECT 
        COUNT(*) as total_dedup_records,
        COUNT(CASE WHEN lpcd_value::numeric > 0 THEN 1 END) as positive_lpcd,
        COUNT(CASE WHEN lpcd_value::numeric = 0 THEN 1 END) as zero_lpcd,
        AVG(lpcd_value::numeric) as avg_lpcd
      FROM deduplicated_history;
    `, [dates]);
    console.log('Deduplicated history summary for 16-Sep..22-Sep:', dedupSample.rows);

    // Look at actual sample rows of 16-Sep..22-Sep
    const sampleRows = await client.query(`
      SELECT scheme_id, scheme_name, village_name, block, data_date, water_value, lpcd_value, uploaded_at, upload_batch_id
      FROM water_scheme_data_history
      WHERE data_date IN ('16-Sep', '17-Sep', '18-Sep', '19-Sep', '20-Sep', '21-Sep', '22-Sep')
      LIMIT 20
    `);
    console.log('Sample rows:', sampleRows.rows);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
