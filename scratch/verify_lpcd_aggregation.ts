import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const report_month = "2026-04";
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const parts = report_month.split("-");
    const monthNum = parseInt(parts[1], 10);
    const monthName = months[monthNum - 1] || "";
    
    const lpcdParams = [`%-${monthName}%`, `${report_month}-%`];
    const testQuery = `
      SELECT 
        s.scheme_id, s.scheme_name,
        h.data_date,
        COUNT(*) as record_count,
        AVG(h.lpcd_value) as lpcd_avg
      FROM (
        SELECT DISTINCT ON (scheme_id) scheme_id, scheme_name 
        FROM scheme_status
      ) s
      INNER JOIN (
        SELECT DISTINCT scheme_id FROM water_scheme_data_history
      ) integrated ON s.scheme_id = integrated.scheme_id
      LEFT JOIN water_scheme_data_history h ON s.scheme_id = h.scheme_id AND (h.data_date LIKE $1 OR h.data_date LIKE $2)
      WHERE s.scheme_id = '20003791'
      GROUP BY s.scheme_id, s.scheme_name, h.data_date
      ORDER BY h.data_date ASC
      LIMIT 10
    `;

    const res = await pool.query(testQuery, lpcdParams);
    console.log("Grouped LPCD query results for scheme '20003791':");
    console.table(res.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

main();
