
const { Client } = require('pg');
require('dotenv').config();
async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const resId = await client.query('SELECT COUNT(DISTINCT scheme_id) as count FROM scheme_status');
    const resName = await client.query('SELECT COUNT(DISTINCT scheme_name) as count FROM scheme_status');
    console.log('UNIQUE_SCHEME_IDS:' + resId.rows[0].count);
    console.log('UNIQUE_SCHEME_NAMES:' + resName.rows[0].count);

    const resDup = await client.query(`
      SELECT scheme_name, COUNT(DISTINCT scheme_id) as id_count 
      FROM scheme_status 
      GROUP BY scheme_name 
      HAVING COUNT(DISTINCT scheme_id) > 1
    `);
    if (resDup.rows.length > 0) {
      console.log('Schemes with same name but different IDs:');
      console.log(JSON.stringify(resDup.rows));
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
