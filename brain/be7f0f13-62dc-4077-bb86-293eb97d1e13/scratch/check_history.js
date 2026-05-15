
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function checkHistory() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT scheme_id, data_date, lpcd_value FROM scheme_lpcd_data_history LIMIT 100');
    console.table(res.rows);
    
    const zeroCount = await client.query('SELECT count(*) FROM scheme_lpcd_data_history WHERE lpcd_value::numeric = 0');
    console.log('Total zero records:', zeroCount.rows[0].count);
    
    const highCount = await client.query('SELECT count(*) FROM scheme_lpcd_data_history WHERE lpcd_value::numeric > 55');
    console.log('Total high records:', highCount.rows[0].count);
  } finally {
    client.release();
    await pool.end();
  }
}

checkHistory();
