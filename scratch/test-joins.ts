import { pool } from '../server/db';

async function test() {
  try {
    const res = await pool.query(`
      SELECT 
        h.scheme_id as h_id, 
        ss.scheme_id as ss_id, 
        ss.agency_type
      FROM scheme_lpcd_data_history h
      LEFT JOIN scheme_status ss ON h.scheme_id = ss.scheme_id
      WHERE ss.agency_type IS NOT NULL
      LIMIT 5
    `);
    console.log("scheme_lpcd_data_history matched with scheme_status:");
    console.log(res.rows);

    const res2 = await pool.query(`
      SELECT 
        sl.scheme_id as sl_id, 
        ss.scheme_id as ss_id, 
        ss.agency_type
      FROM scheme_lpcd sl
      LEFT JOIN scheme_status ss ON sl.scheme_id = ss.scheme_id
      WHERE ss.agency_type IS NOT NULL
      LIMIT 5
    `);
    console.log("scheme_lpcd matched with scheme_status:");
    console.log(res2.rows);

  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

test();
