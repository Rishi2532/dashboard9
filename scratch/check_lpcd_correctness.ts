import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    // Check how many unique integrated schemes exist in water_scheme_data_history
    const integratedCountRes = await pool.query(
      `SELECT COUNT(DISTINCT scheme_id) FROM water_scheme_data_history`
    );
    console.log("Total unique scheme_ids in water_scheme_data_history:", integratedCountRes.rows[0].count);

    // Run a count of how many schemes are retrieved by the specific join query in the router for a month (e.g. April 2026)
    const report_month = "2026-04";
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const parts = report_month.split("-");
    const monthNum = parseInt(parts[1], 10);
    const monthName = months[monthNum - 1] || "";
    
    const lpcdParams = [`%-${monthName}%`, `${report_month}-%`];
    const lpcdQuery = `
      SELECT COUNT(DISTINCT s.scheme_id) as scheme_count, COUNT(*) as row_count
      FROM (
        SELECT DISTINCT ON (scheme_id) scheme_id, region, circle, division, sub_division, block, scheme_name 
        FROM scheme_status
      ) s
      INNER JOIN (
        SELECT DISTINCT scheme_id FROM water_scheme_data_history
      ) integrated ON s.scheme_id = integrated.scheme_id
      LEFT JOIN water_scheme_data_history h ON s.scheme_id = h.scheme_id AND (h.data_date LIKE $1 OR h.data_date LIKE $2)
    `;

    const res = await pool.query(lpcdQuery, lpcdParams);
    console.log("LPCD Query result for April 2026:");
    console.table(res.rows);

    // Let's also print some sample LPCD averages to see if they look correct
    const sampleRes = await pool.query(`
      SELECT s.scheme_id, s.scheme_name, h.data_date, h.lpcd_value
      FROM (
        SELECT DISTINCT ON (scheme_id) scheme_id, scheme_name 
        FROM scheme_status
      ) s
      INNER JOIN (
        SELECT DISTINCT scheme_id FROM water_scheme_data_history
      ) integrated ON s.scheme_id = integrated.scheme_id
      INNER JOIN water_scheme_data_history h ON s.scheme_id = h.scheme_id AND (h.data_date LIKE $1 OR h.data_date LIKE $2)
      LIMIT 10
    `, lpcdParams);
    console.log("Sample LPCD values:");
    console.table(sampleRes.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

main();
