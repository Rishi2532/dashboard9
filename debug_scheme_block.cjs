require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/dashboard',
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Querying scheme_status...');
    const resStatus = await client.query(`
      SELECT scheme_name, scheme_id, block, division 
      FROM scheme_status 
      WHERE scheme_name ILIKE '%Pophali%' OR scheme_name ILIKE '%Takli%'
    `);
    const fs = require('fs');
    let output = 'scheme_status Results:\n';
    resStatus.rows.forEach(r => output += `  Name: ${r.scheme_name}, ID: '${r.scheme_id}', Block: '${r.block}'\n`);
    
    console.log('\nQuerying scheme_lpcd_data_history...');
    const resHistory = await client.query(`
      SELECT scheme_name, scheme_id, block 
      FROM scheme_lpcd_data_history 
      WHERE scheme_name ILIKE '%Pophali%' OR scheme_name ILIKE '%Takli%'
      LIMIT 5
    `);

    output += '\nscheme_lpcd_data_history Results:\n';
    resHistory.rows.forEach(r => output += `  Name: ${r.scheme_name}, ID: '${r.scheme_id}', Block: '${r.block}'\n`);

    fs.writeFileSync('debug_output.txt', output);
    console.log('Written to debug_output.txt');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
