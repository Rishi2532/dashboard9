import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const report_month = "2026-04";
    const start = new Date(`${report_month}-01T00:00:00Z`);
    const next = new Date(start);
    next.setMonth(start.getMonth() + 1);

    const startIso = start.toISOString();
    const nextIso = next.toISOString();

    // Find timestamps in the month
    const timesQuery = `
      SELECT DISTINCT uploaded_at 
      FROM scheme_status_history 
      WHERE uploaded_at >= $1 AND uploaded_at < $2
      ORDER BY uploaded_at ASC
    `;
    const timesRes = await pool.query(timesQuery, [startIso, nextIso]);
    console.log("Timestamps found in scheme_status_history for April 2026:", timesRes.rows.map(r => r.uploaded_at));

    if (timesRes.rows.length >= 2) {
      const start_time = timesRes.rows[0].uploaded_at;
      const end_time = timesRes.rows[timesRes.rows.length - 1].uploaded_at;

      console.log(`Comparing start_time: ${start_time} and end_time: ${end_time}`);

      // Count schemes at start_time
      const countStart = await pool.query(
        "SELECT COUNT(DISTINCT scheme_id) FROM scheme_status_history WHERE uploaded_at = $1",
        [start_time]
      );
      // Count schemes at end_time
      const countEnd = await pool.query(
        "SELECT COUNT(DISTINCT scheme_id) FROM scheme_status_history WHERE uploaded_at = $1",
        [end_time]
      );

      console.log(`Scheme IDs count at start: ${countStart.rows[0].count}`);
      console.log(`Scheme IDs count at end: ${countEnd.rows[0].count}`);

      // Let's see if any scheme IDs are in end but not start
      const newSchemes = await pool.query(
        `SELECT DISTINCT scheme_id, scheme_name FROM scheme_status_history WHERE uploaded_at = $1 AND scheme_id NOT IN (SELECT DISTINCT scheme_id FROM scheme_status_history WHERE uploaded_at = $2)`,
        [end_time, start_time]
      );
      console.log("New scheme IDs found in scheme_status_history:", newSchemes.rows);
    } else {
      console.log("Not enough timestamps found to compare start and end.");
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

main();
