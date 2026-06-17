import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT email, phone FROM vendor WHERE email = 'rushikeshsalunkhe36@gmail.com' OR employee_name ILIKE '%Rishikesh%'", (err, res) => {
  console.log(err || res.rows);
  pool.end();
});
