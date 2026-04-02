import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

async function run() {
  const { Pool } = pg;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    const res = await client.query(`
      SELECT 
        data_date,
        uploaded_at,
        (
          CASE 
            WHEN data_date ~ '^\\d{1,2}-[A-Za-z]+$' THEN 
              CASE 
                WHEN EXTRACT(MONTH FROM TO_DATE(data_date, 'DD-Mon')) >= 11 AND EXTRACT(MONTH FROM uploaded_at) <= 2 THEN
                  TO_CHAR(TO_DATE(data_date || '-' || (EXTRACT(YEAR FROM uploaded_at) - 1)::text, 'DD-Mon-YYYY'), 'DD-Mon-YYYY')
                ELSE 
                  TO_CHAR(TO_DATE(data_date || '-' || EXTRACT(YEAR FROM uploaded_at)::text, 'DD-Mon-YYYY'), 'DD-Mon-YYYY')
              END
            ELSE data_date
          END
        ) as resolved_date
      FROM scheme_lpcd_data_history
      LIMIT 10;
    `);
    console.table(res.rows);
  } catch (error) {
    console.error(error);
  } finally {
    client.release();
    pool.end();
  }
}

run().catch(console.error);
