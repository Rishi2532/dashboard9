import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const schemeId = '20028535';

pool.query(`SELECT fully_completion_scheme_status, mjp_commissioned, mjp_fully_completed, water_supply FROM scheme_status WHERE scheme_id = $1`, [schemeId], (err, res) => {
  console.log(err || res.rows);
  pool.end();
});
