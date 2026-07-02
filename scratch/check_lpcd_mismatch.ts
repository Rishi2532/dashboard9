import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const monthName = "Mar";
    const report_month = "2026-03";
    
    // Updated query using scheme_lpcd_data_history
    const lpcdQuery = `
      SELECT 
        s.region, s.circle, s.division, s.sub_division, s.block, s.scheme_id, s.scheme_name, s.water_supply,
        h.data_date,
        h.lpcd_value as lpcd_avg
      FROM (
        SELECT DISTINCT ON (scheme_id) scheme_id, region, circle, division, sub_division, block, scheme_name, water_supply 
        FROM scheme_status
      ) s
      INNER JOIN (
        SELECT DISTINCT scheme_id FROM scheme_lpcd_data_history
      ) integrated ON s.scheme_id = integrated.scheme_id
      LEFT JOIN scheme_lpcd_data_history h ON s.scheme_id = h.scheme_id AND (h.data_date LIKE $1 OR h.data_date LIKE $2)
      ORDER BY s.region, s.circle, s.division, s.sub_division, s.block, s.scheme_name, s.scheme_id
    `;
    
    const resLpcd = await pool.query(lpcdQuery, [`%-${monthName}%`, `${report_month}-%`]);
    console.log("Total rows from updated lpcdQuery:", resLpcd.rows.length);
    console.log("Sample rows from updated lpcdQuery:");
    console.table(resLpcd.rows.slice(0, 10));

    // Verify specifically for Peth RR (20022133) on 03-Mar
    const pethRow = resLpcd.rows.find(r => r.scheme_id === '20022133' && r.data_date === '03-Mar');
    console.log("Peth RR on 03-Mar from query:", pethRow);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
