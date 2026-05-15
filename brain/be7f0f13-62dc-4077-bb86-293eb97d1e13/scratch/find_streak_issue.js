
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function findPattern() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT scheme_id, block, data_date, lpcd_value, uploaded_at 
      FROM scheme_lpcd_data_history 
      ORDER BY scheme_id, block, uploaded_at DESC
    `);
    
    console.log('Total records:', res.rows.length);

    const schemes = {};
    res.rows.forEach(r => {
      if (!schemes[r.scheme_id]) schemes[r.scheme_id] = [];
      schemes[r.scheme_id].push(r);
    });

    console.log('Total schemes in history:', Object.keys(schemes).length);

    for (const id in schemes) {
      const history = schemes[id];
      const hasZero = history.some(h => parseFloat(h.lpcd_value) === 0);
      const hasHigh = history.some(h => parseFloat(h.lpcd_value) > 55);
      
      if (hasZero && hasHigh) {
        console.log('Scheme ID:', id);
        console.log('History Sample (Last 10 uploads):');
        console.table(history.slice(0, 10).map(h => ({
            date: h.data_date,
            val: h.lpcd_value,
            uploaded: h.uploaded_at
        })));
        console.log('-------------------');
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

findPattern();
