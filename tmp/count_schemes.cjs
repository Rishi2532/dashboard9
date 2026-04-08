
const { Client } = require('pg');
require('dotenv').config();
async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const res = await client.query('SELECT COUNT(DISTINCT scheme_id) as count FROM scheme_status');
    console.log('UNIQUE_SCHEMES_COUNT:' + res.rows[0].count);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
