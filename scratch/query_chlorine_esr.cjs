
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function query() {
  const schemeId = '417239';
  const villageName = 'Rui';
  const esrName = 'Existing 3 LL MBR- Outlet-1';

  try {
    const res = await pool.query(
      'SELECT * FROM chlorine_data WHERE scheme_id = $1 AND village_name = $2 AND esr_name = $3',
      [schemeId, villageName, esrName]
    );
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

query();
