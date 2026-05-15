
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function checkStatuses() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT 
        sl.scheme_id, sl.block as lpcd_block, ss.block as status_block, 
        ss.fully_completion_scheme_status, ss.scheme_name
      FROM scheme_lpcd sl
      LEFT JOIN scheme_status ss ON sl.scheme_id = ss.scheme_id
    `);
    
    console.log('Total schemes found:', res.rows.length);
    
    const statusCounts = {};
    res.rows.forEach(r => {
      const status = r.fully_completion_scheme_status ? r.fully_completion_scheme_status.toLowerCase().trim() : 'null';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    console.log('Status counts:', statusCounts);

    const allowedStatuses = ['fully completed', 'completed', 'in progress', 'connected'];
    const excluded = res.rows.filter(r => {
      const status = r.fully_completion_scheme_status ? r.fully_completion_scheme_status.toLowerCase().trim() : 'null';
      return !allowedStatuses.includes(status);
    });
    
    console.log('Excluded schemes (count):', excluded.length);
    if (excluded.length > 0) {
      console.log('Sample excluded:', excluded.slice(0, 5));
    }

    const blockMismatches = res.rows.filter(r => r.lpcd_block !== r.status_block);
    console.log('Block mismatches (count):', blockMismatches.length);
    const target = blockMismatches.find(r => r.scheme_id === '20032963');
    if (target) {
      console.log('Scheme 20032963 mismatch:', target);
    }

  } finally {
    client.release();
    await pool.end();
  }
}

checkStatuses();
