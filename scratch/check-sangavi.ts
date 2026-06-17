import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const schemeId = '20028535';
const village = 'Sangavi Bk';

pool.query(`SELECT * FROM communication_status WHERE scheme_id = $1 AND village_name = $2`, [schemeId, village], (err, res) => {
  console.log(err || res.rows);
  pool.end();
});
