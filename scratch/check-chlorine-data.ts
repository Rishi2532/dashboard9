import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

pool.query(`SELECT region, circle, division, sub_division, block, village_name, esr_name FROM chlorine_data WHERE scheme_id = '20028535' AND village_name = 'Sangavi Bk'`, (err, res) => {
  console.log(err || res.rows);
  pool.end();
});
